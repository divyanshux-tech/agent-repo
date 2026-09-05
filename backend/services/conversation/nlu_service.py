import re
from datetime import date, timedelta
from typing import Any, Optional

from services.conversation.clarification_manager import ClarificationManager
from services.conversation.nlu_schema import (
    BudgetEntity,
    LocationEntity,
    NLUAction,
    NLUEntities,
    NLUInput,
    NLUResult,
    ScalarEntity,
    TravelDateEntity,
)
from services.conversation.reference_resolver import ReferenceResolver
from services.conversation.state_updater import StateUpdater
from services.llm_provider import LLMProvider, get_llm_provider


SYSTEM_PROMPT = """
You are the multilingual NLU layer for an Indian AI travel agent.
Understand English, Hindi, Hinglish, transliterated Hindi, corrections, negation,
follow-ups, and references without translating or normalizing the user's style away.

Return ONLY strict JSON with:
intent, action, confidence, language, is_code_mixed, raw_transcript, entities,
state_updates, missing_required_fields, requires_clarification, next_question,
user_facing_message.

Supported action values:
START_PLANNING, RECOMMEND_DESTINATIONS, SEARCH_COMPONENTS, CHANGE_HOTEL,
CHANGE_TRAVEL, CHANGE_ACTIVITY, UPDATE_BUDGET, REPLAN_ALL, CONFIRM_BOOKING,
ASK_KNOWLEDGE, GET_WEATHER, EXPLAIN_PLAN, GET_ITINERARY, UNKNOWN.

Never invent flight, hotel, weather, price, availability, or booking facts.
Ask only one clarification question when required fields are missing.
"""


CITY_ALIASES = {
    "bombay": "Mumbai",
    "mumbai": "Mumbai",
    "bangalore": "Bengaluru",
    "bengaluru": "Bengaluru",
    "calcutta": "Kolkata",
    "kolkata": "Kolkata",
    "madras": "Chennai",
    "chennai": "Chennai",
    "poona": "Pune",
    "pune": "Pune",
    "dilli": "Delhi",
    "delhi": "Delhi",
    "goa": "Goa",
    "gokarna": "Gokarna",
    "jaipur": "Jaipur",
    "kerala": "Kerala",
    "manali": "Manali",
    "hampi": "Hampi",
    "spiti": "Spiti Valley",
    "ladakh": "Ladakh",
    "rishikesh": "Rishikesh",
    "varanasi": "Varanasi",
    "udaipur": "Udaipur",
    "munnar": "Munnar",
}

REGIONS = {"kashmir", "himachal", "rajasthan", "north east", "northeast"}

MONTHS = {
    "january": 1,
    "jan": 1,
    "february": 2,
    "feb": 2,
    "march": 3,
    "mar": 3,
    "april": 4,
    "apr": 4,
    "may": 5,
    "june": 6,
    "jun": 6,
    "july": 7,
    "jul": 7,
    "august": 8,
    "aug": 8,
    "september": 9,
    "sep": 9,
    "october": 10,
    "oct": 10,
    "november": 11,
    "nov": 11,
    "december": 12,
    "dec": 12,
}

INTEREST_WORDS = {
    "beach": "beach",
    "beaches": "beach",
    "trek": "trekking",
    "trekking": "trekking",
    "adventure": "adventure",
    "heritage": "heritage",
    "food": "food",
    "peaceful": "peaceful",
    "shaant": "peaceful",
    "less crowded": "less_crowded",
    "offbeat": "offbeat",
    "family": "family",
    "premium": "premium",
    "budget": "budget",
}


class NLUService:
    def __init__(self, llm_provider: Optional[LLMProvider] = None):
        self.llm_provider = llm_provider or get_llm_provider()
        self.state_updater = StateUpdater()
        self.clarifications = ClarificationManager()
        self.references = ReferenceResolver()

    async def parse_turn(
        self,
        nlu_input: NLUInput,
        current_state: Optional[dict[str, Any]] = None,
        conversation_history: Optional[list[Any]] = None,
        memory_context: str = ""
    ) -> NLUResult:
        # Inject memory context dynamically if present
        prompt = SYSTEM_PROMPT
        if memory_context:
            prompt = memory_context + "\n" + SYSTEM_PROMPT
            
        llm_data = await self.llm_provider.generate_json(
            prompt,
            {
                "transcript": nlu_input.transcript,
                "language": nlu_input.language,
                "language_confidence": nlu_input.language_confidence,
                "is_code_mixed": nlu_input.is_code_mixed,
                "current_trip_state": current_state or {},
                "conversation_history": self._history_payload(conversation_history or []),
            },
        )

        result = self._result_from_llm(llm_data, nlu_input)
        deterministic = self._deterministic_result(nlu_input, current_state)
        result = self._merge_results(result, deterministic)

        merged_state = self.state_updater.merge(current_state, result.state_updates)
        missing = self.clarifications.missing_fields(merged_state, result.action.value)

        if missing:
            result.missing_required_fields = missing
            result.requires_clarification = True
            result.next_question = self.clarifications.next_question(missing, result.language)
            result.user_facing_message = result.next_question or result.user_facing_message
        elif result.action == NLUAction.START_PLANNING:
            result.action = NLUAction.SEARCH_COMPONENTS
            result.intent = NLUAction.SEARCH_COMPONENTS

        if not result.user_facing_message:
            result.user_facing_message = self._default_message(result)

        return result

    def _result_from_llm(self, data: Optional[dict[str, Any]], nlu_input: NLUInput) -> NLUResult:
        if not data:
            return NLUResult(
                intent=NLUAction.UNKNOWN,
                action=NLUAction.UNKNOWN,
                confidence=0.0,
                language=nlu_input.language,
                is_code_mixed=nlu_input.is_code_mixed,
                raw_transcript=nlu_input.transcript,
            )

        try:
            data.setdefault("raw_transcript", nlu_input.transcript)
            data.setdefault("language", nlu_input.language)
            data.setdefault("is_code_mixed", nlu_input.is_code_mixed)
            if "action" not in data and "intent" in data:
                data["action"] = data["intent"]
            return NLUResult(**data)
        except Exception:
            return NLUResult(
                intent=NLUAction.UNKNOWN,
                action=NLUAction.UNKNOWN,
                confidence=0.0,
                language=nlu_input.language,
                is_code_mixed=nlu_input.is_code_mixed,
                raw_transcript=nlu_input.transcript,
            )

    def _deterministic_result(self, nlu_input: NLUInput, current_state: Optional[dict[str, Any]]) -> NLUResult:
        text = nlu_input.transcript.strip()
        lower = text.lower()
        entities = NLUEntities()

        action = self._classify_action(lower, current_state)
        entities.origin, entities.destination = self._extract_locations(lower)
        entities.travel_dates = self._extract_dates(lower)
        entities.duration_days = self._extract_duration(lower)
        entities.travellers = self._extract_travellers(lower)
        entities.traveller_type = self._extract_traveller_type(lower)
        entities.budget = self._extract_budget(lower)
        entities.interests = self._extract_interests(lower)
        entities.excluded_preferences = self._extract_negations(lower)
        entities.constraints = self._extract_constraints(lower)
        entities.transport_preference = self._extract_transport(lower)
        entities.hotel_preference = self._extract_hotel_preference(lower)
        entities.activity_preference = self._extract_activity_preference(lower)
        entities.target_candidate_reference = self.references.resolve(text, current_state)

        updates = self._state_updates(entities, action, lower)

        return NLUResult(
            intent=action,
            action=action,
            confidence=0.86,
            language=self._language(nlu_input, lower),
            is_code_mixed=nlu_input.is_code_mixed or self._is_code_mixed(lower),
            raw_transcript=text,
            entities=entities,
            state_updates=updates,
            user_facing_message="",
        )

    def _merge_results(self, base: NLUResult, deterministic: NLUResult) -> NLUResult:
        if base.action == NLUAction.UNKNOWN or deterministic.confidence >= base.confidence:
            action = deterministic.action
        else:
            action = base.action

        base.intent = action
        base.action = action
        base.confidence = max(base.confidence, deterministic.confidence)
        base.language = deterministic.language if base.language == "unknown" else base.language
        base.is_code_mixed = base.is_code_mixed or deterministic.is_code_mixed
        base.entities = self._merge_entities(base.entities, deterministic.entities)
        base.state_updates = self._merge_update_dicts(base.state_updates, deterministic.state_updates)
        return base

    def _merge_entities(self, base: NLUEntities, incoming: NLUEntities) -> NLUEntities:
        data = base.model_dump()
        incoming_data = incoming.model_dump()
        for key, value in incoming_data.items():
            if value in (None, [], {}):
                continue
            if isinstance(value, list):
                data[key] = list(dict.fromkeys((data.get(key) or []) + value))
            else:
                data[key] = value
        return NLUEntities(**data)

    def _merge_update_dicts(self, base: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
        merged = dict(base or {})
        for key, value in incoming.items():
            if value is None:
                continue
            if key in {"constraints", "excluded_preferences", "interests"}:
                current = merged.get(key, [])
                items = value if isinstance(value, list) else [value]
                merged[key] = list(dict.fromkeys(current + items))
            elif isinstance(value, dict) and isinstance(merged.get(key), dict):
                nested = dict(merged[key])
                nested.update({k: v for k, v in value.items() if v is not None})
                merged[key] = nested
            else:
                merged[key] = value
        return merged

    def _classify_action(self, lower: str, current_state: Optional[dict[str, Any]]) -> NLUAction:
        if re.search(r"\b(weather|mausam|rain|barish|baarish|jacket|temperature)\b", lower):
            return NLUAction.GET_WEATHER
        if re.search(r"\b(day by day|itinerary|har din|complete itinerary)\b", lower):
            return NLUAction.GET_ITINERARY
        if re.search(r"\b(kyun|why)\b", lower) and re.search(r"\b(plan|hotel|option|best|suggest)\b", lower):
            return NLUAction.EXPLAIN_PLAN
        if re.search(r"\b(book|pakka|confirm|final kar)\b", lower):
            return NLUAction.CONFIRM_BOOKING
        if re.search(r"\b(sab kuch|fresh|poora|pura|dobara|start over)\b", lower) and re.search(r"\b(change|badlo|badal|replan|plan)\b", lower):
            return NLUAction.REPLAN_ALL
        if re.search(r"\b(hotel|stay|resort)\b", lower) and re.search(r"\b(change|doosra|dusra|better|sasta|cheap|pasand nahi|expensive|mehenga|paas)\b", lower):
            return NLUAction.CHANGE_HOTEL
        if re.search(r"\b(flight|train|travel|return)\b", lower) and re.search(r"\b(change|doosri|dusri|doosra|dusra|dekh|check|morning|expensive|mehengi|mehenga|jagah)\b", lower):
            return NLUAction.CHANGE_TRAVEL
        if re.search(r"\b(train se|flight ki jagah train|train better)\b", lower):
            return NLUAction.CHANGE_TRAVEL
        if re.search(r"\b(activity|activities|rafting|adventure|relaxing|karna)\b", lower) and re.search(r"\b(change|aur|hata|nahi|dikhao|chahiye)\b", lower):
            return NLUAction.CHANGE_ACTIVITY
        if re.search(r"\b(budget|under|andar|max|zyada|badha|kam|reduce|stretch|hazaar|hazar|k)\b", lower) and not re.search(r"\b(trip|jaana|plan)\b", lower):
            return NLUAction.UPDATE_BUDGET
        if re.search(r"\b(kya dekh|kya kya|famous|sahi hai|entry fee|timing)\b", lower):
            return NLUAction.ASK_KNOWLEDGE
        if re.search(r"\b(kahaan|kahan|where|suggest|recommend|peaceful|shaant|less crowded|offbeat)\b", lower) and not self._has_destination(lower):
            return NLUAction.RECOMMEND_DESTINATIONS
        if re.search(r"\b(flights? aur hotels?|search|dikhao)\b", lower) and current_state:
            return NLUAction.SEARCH_COMPONENTS
        if re.search(r"\b(plan|trip|jaana|ghumna|travel|chahiye|bana)\b", lower) or self._has_destination(lower):
            return NLUAction.START_PLANNING
        return NLUAction.UNKNOWN

    def _extract_locations(self, lower: str) -> tuple[Optional[LocationEntity], Optional[LocationEntity]]:
        origin = None
        destination = None

        se_match = re.search(r"\b([a-z ]+?)\s+se\s+([a-z ]+?)\s+(?:jaana|jana|travel|ghumna|flight|train)\b", lower)
        if se_match:
            origin = self._location_entity(se_match.group(1).strip())
            destination = self._location_entity(se_match.group(2).strip())

        to_match = re.search(r"\bfrom\s+([a-z ]+?)\s+to\s+([a-z ]+)", lower)
        if to_match:
            origin = self._location_entity(to_match.group(1).strip())
            destination = self._location_entity(to_match.group(2).strip())

        correction = re.search(r"\b(?:nahi|nahin)\s+([a-z]+)\s+(?:nahi|nahin),?\s+([a-z]+)", lower)
        if correction:
            destination = self._location_entity(correction.group(2).strip())

        if not destination:
            for raw in sorted(CITY_ALIASES, key=len, reverse=True):
                if re.search(rf"\b{re.escape(raw)}\b", lower):
                    destination = self._location_entity(raw)
                    break

        return origin, destination

    def _location_entity(self, raw: str) -> LocationEntity:
        raw = self._clean_location(raw)
        canonical = CITY_ALIASES.get(raw.lower(), raw.title())
        is_region = raw.lower() in REGIONS
        return LocationEntity(
            raw_value=raw.title() if raw else raw,
            canonical_value=canonical,
            type="region" if is_region else "city",
            confidence=0.78 if is_region else 0.95,
            is_ambiguous=is_region,
        )

    def _clean_location(self, raw: str) -> str:
        words = [w for w in raw.split() if w not in {"mujhe", "main", "mein", "me", "ko", "ke", "liye", "actually", "nahi", "nahin"}]
        return " ".join(words[-2:]).strip()

    def _extract_dates(self, lower: str) -> Optional[TravelDateEntity]:
        for name, month in MONTHS.items():
            if re.search(rf"\b{name}\b", lower):
                week = None
                precision = "month"
                if "second week" in lower or "dusre week" in lower:
                    week = 2
                    precision = "week"
                elif "starting" in lower or "start" in lower:
                    precision = "early_month"
                elif "end" in lower:
                    precision = "late_month"
                return TravelDateEntity(month=month, week_of_month=week, precision=precision, raw_value=name)

        if "next weekend" in lower or "agla weekend" in lower:
            return TravelDateEntity(precision="relative", raw_value="next weekend")
        if "next month" in lower:
            next_month = date.today().replace(day=1) + timedelta(days=32)
            return TravelDateEntity(month=next_month.month, precision="month", raw_value="next month")
        if "next friday" in lower:
            return TravelDateEntity(start=self._next_weekday(4).isoformat(), precision="day", raw_value="next friday")
        return None

    def _extract_duration(self, lower: str) -> Optional[ScalarEntity]:
        match = re.search(r"\b(\d+)(?:\s*-\s*\d+)?\s*(?:din|days?|day)\b", lower)
        if match:
            return ScalarEntity(value=int(match.group(1)), confidence=0.95, raw_value=match.group(0))
        if "weekend" in lower:
            return ScalarEntity(value=2, confidence=0.8, raw_value="weekend")
        return None

    def _extract_travellers(self, lower: str) -> Optional[ScalarEntity]:
        adults_kids = re.search(r"\b(\d+)\s*adults?\s+(?:aur|and)\s+(\d+)\s*kids?\b", lower)
        if adults_kids:
            total = int(adults_kids.group(1)) + int(adults_kids.group(2))
            return ScalarEntity(value=total, confidence=0.95, raw_value=adults_kids.group(0))

        match = re.search(r"\b(\d+)\s*(?:log|people|travellers?|travelers?|persons?|adults?|kids?)\b", lower)
        if match:
            return ScalarEntity(value=int(match.group(1)), confidence=0.95, raw_value=match.group(0))
        if "parents" in lower:
            return ScalarEntity(value=2, confidence=0.65, raw_value="parents")
        return None

    def _extract_traveller_type(self, lower: str) -> Optional[ScalarEntity]:
        for value in ["family", "solo", "couple", "friends", "parents"]:
            if value in lower:
                return ScalarEntity(value=value, confidence=0.9, raw_value=value)
        return None

    def _extract_budget(self, lower: str) -> Optional[BudgetEntity]:
        amount = None
        raw_value = None
        k_match = re.search(r"\b(\d+(?:\.\d+)?)\s*k\b", lower)
        if k_match:
            amount = int(float(k_match.group(1)) * 1000)
            raw_value = k_match.group(0)
        if amount is None:
            num_match = re.search(r"(?:rs\.?|inr|budget|under|andar|max|tak|around|aas paas)?\s*(\d{4,6})", lower)
            if num_match:
                amount = int(num_match.group(1))
                raw_value = num_match.group(0).strip()
        if amount is None:
            hazaar_match = re.search(r"\b(\d+)\s*(?:hazaar|hazar|thousand)\b", lower)
            if hazaar_match:
                amount = int(hazaar_match.group(1)) * 1000
                raw_value = hazaar_match.group(0)
        if amount is None and "tees hazaar" in lower:
            amount = 30000
            raw_value = "tees hazaar"

        if amount is None:
            if re.search(r"\b(budget)\b", lower) and re.search(r"\b(zyada|badha|increase)\b", lower):
                return BudgetEntity(operator="increase")
            if re.search(r"\b(budget)\b", lower) and re.search(r"\b(kam|reduce|decrease)\b", lower):
                return BudgetEntity(operator="decrease")
            return None

        scope = "unknown"
        if "per person" in lower or "per head" in lower:
            scope = "per_person"
        elif "per night" in lower:
            scope = "per_night"
        elif "total" in lower:
            scope = "total"

        operator = None
        if re.search(r"\b(under|andar|max|tak|se zyada nahi|zyada nahi|more than nahi)\b", lower):
            operator = "<="
        elif re.search(r"\b(stretch|tak chalega)\b", lower):
            operator = "<="

        approximate = bool(re.search(r"\b(around|aas paas|lagbhag|approx|approximately)\b", lower))
        return BudgetEntity(amount=amount, scope=scope, operator=operator, approximate=approximate)

    def _extract_interests(self, lower: str) -> list[str]:
        interests = []
        for phrase, interest in INTEREST_WORDS.items():
            if phrase in lower and interest not in interests:
                interests.append(interest)
        return interests

    def _extract_negations(self, lower: str) -> list[str]:
        excluded = []
        for phrase, interest in INTEREST_WORDS.items():
            if re.search(rf"\b{re.escape(phrase)}\s+(?:nahi|nahin|mat|no)\b", lower) or re.search(rf"\bno\s+{re.escape(phrase)}\b", lower):
                excluded.append(interest)
        return excluded

    def _extract_constraints(self, lower: str) -> list[str]:
        constraints = []
        if "less crowded" in lower or "zyada crowded nahi" in lower:
            constraints.append("less_crowded")
        if "no activities" in lower or "activities nahi" in lower:
            constraints.append("no_activities")
        return constraints

    def _extract_transport(self, lower: str) -> Optional[ScalarEntity]:
        if "train" in lower:
            return ScalarEntity(value="train", confidence=0.95, raw_value="train")
        if "flight" in lower:
            return ScalarEntity(value="flight", confidence=0.95, raw_value="flight")
        return None

    def _extract_hotel_preference(self, lower: str) -> Optional[ScalarEntity]:
        if "beach ke paas" in lower:
            return ScalarEntity(value="near_beach", confidence=0.9, raw_value="beach ke paas")
        if "premium" in lower:
            return ScalarEntity(value="premium", confidence=0.85, raw_value="premium")
        if "sasta" in lower or "cheap" in lower:
            return ScalarEntity(value="budget", confidence=0.85, raw_value="sasta")
        return None

    def _extract_activity_preference(self, lower: str) -> Optional[ScalarEntity]:
        if "relaxing" in lower:
            return ScalarEntity(value="relaxing", confidence=0.85, raw_value="relaxing")
        if "adventure" in lower:
            return ScalarEntity(value="adventure", confidence=0.85, raw_value="adventure")
        return None

    def _state_updates(self, entities: NLUEntities, action: NLUAction, lower: str) -> dict[str, Any]:
        updates: dict[str, Any] = {}
        if entities.origin:
            updates["origin"] = entities.origin.model_dump()
        if entities.destination:
            updates["destination"] = entities.destination.model_dump()
        if entities.travel_dates:
            dates = entities.travel_dates.model_dump(exclude_none=True)
            if "precision" in dates:
                dates["date_precision"] = dates.pop("precision")
            updates["travel_dates"] = dates
        if entities.duration_days:
            updates["duration_days"] = entities.duration_days.model_dump()
        if entities.travellers:
            updates["travellers"] = entities.travellers.model_dump()
        if entities.traveller_type:
            updates["traveller_type"] = entities.traveller_type.model_dump()
        if entities.budget:
            updates["budget"] = entities.budget.model_dump()
        if entities.interests:
            updates["interests"] = entities.interests
        if entities.constraints:
            updates["constraints"] = entities.constraints
        if entities.excluded_preferences:
            updates["excluded_preferences"] = entities.excluded_preferences
        if entities.transport_preference:
            updates["transport_preference"] = entities.transport_preference.model_dump()
        if entities.hotel_preference:
            updates["hotel_preference"] = entities.hotel_preference.model_dump()
        if entities.activity_preference:
            updates["activity_preference"] = entities.activity_preference.model_dump()
        if entities.target_candidate_reference:
            updates["target_candidate_reference"] = entities.target_candidate_reference
        if action in {NLUAction.START_PLANNING, NLUAction.RECOMMEND_DESTINATIONS}:
            updates["status"] = "planning"
        if "nahi" in lower or "actually" in lower or "arre" in lower:
            updates["last_turn_was_correction"] = True
        return updates

    def _default_message(self, result: NLUResult) -> str:
        if result.requires_clarification and result.next_question:
            return result.next_question
        if result.action == NLUAction.UNKNOWN:
            return "Sorry, main thoda miss kar gaya. Aap trip plan karna chahte hain ya existing plan change karna?"
        return "Samajh gaya. Main is request par kaam kar raha hoon."

    def _language(self, nlu_input: NLUInput, lower: str) -> str:
        if nlu_input.language and nlu_input.language != "unknown":
            return nlu_input.language
        return "hinglish" if self._is_code_mixed(lower) else "en"

    def _is_code_mixed(self, lower: str) -> bool:
        hindi_markers = {"mujhe", "mein", "jaana", "chahiye", "karo", "dikhao", "kitne", "log", "nahi", "hai"}
        english_markers = {"trip", "plan", "budget", "hotel", "flight", "train", "activity", "weather"}
        return bool(set(lower.split()) & hindi_markers) and bool(set(lower.split()) & english_markers)

    def _has_destination(self, lower: str) -> bool:
        return any(re.search(rf"\b{re.escape(city)}\b", lower) for city in CITY_ALIASES)

    def _next_weekday(self, weekday: int) -> date:
        today = date.today()
        days_ahead = weekday - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return today + timedelta(days=days_ahead)

    def _history_payload(self, history: list[Any]) -> list[dict[str, str]]:
        payload = []
        for item in history[-8:]:
            if isinstance(item, dict):
                payload.append({"role": item.get("role", ""), "content": item.get("content", "")})
            else:
                payload.append({"role": getattr(item, "role", ""), "content": getattr(item, "content", "")})
        return payload
