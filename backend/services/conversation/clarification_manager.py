from typing import Any


class ClarificationManager:
    # origin is NOT required - we default to Delhi if not provided
    REQUIRED_FIELDS = ["destination", "travel_dates", "travellers", "duration_days", "budget"]

    def missing_fields(self, state: dict[str, Any], action: str) -> list[str]:
        # These actions don't need full trip info
        if action in {
            "RECOMMEND_DESTINATIONS",
            "CHANGE_HOTEL",
            "CHANGE_TRAVEL",
            "CHANGE_ACTIVITY",
            "UPDATE_BUDGET",
            "REPLAN_ALL",
            "CONFIRM_BOOKING",
            "ASK_KNOWLEDGE",
            "GET_WEATHER",
            "EXPLAIN_PLAN",
            "GET_ITINERARY",
            "GET_PACKING_LIST",
            "GET_DOCUMENT",
            "GET_FLIGHT_STATUS",
        }:
            return []

        missing = []
        # Destination first - most important
        if not self._location_value(state.get("destination")) and not state.get("destination_preference"):
            missing.append("destination")
        # Travel date second
        if not self._date_present(state.get("travel_dates")):
            missing.append("travel_dates")
        # Travellers third
        if not self._scalar_value(state.get("travellers")):
            missing.append("travellers")
        # Days fourth
        if not self._scalar_value(state.get("duration_days")):
            missing.append("duration_days")
        # Budget last
        if not self._budget_amount(state.get("budget")):
            missing.append("budget")
        return missing

    def next_question(self, missing: list[str], language: str = "en") -> str | None:
        if not missing:
            return None

        field = missing[0]
        is_hindi = language in {"hi", "hinglish", "hi-en", "unknown"}
        
        questions = {
            "destination": (
                "Aap kahan jaana chahte hain? Beach, mountains, ya koi specific city?" 
                if is_hindi else 
                "Where would you like to travel? Any specific city, or a vibe like beaches or mountains?"
            ),
            "travel_dates": (
                "Kitne tarikh ko jaana plan hai? Month bhi theek hai!"
                if is_hindi else
                "When are you planning to travel? Even a rough month works!"
            ),
            "travellers": (
                "Kitne log travel karenge — sirf aap, ya family/friends ke saath?"
                if is_hindi else
                "How many people are travelling — just you, or with friends/family?"
            ),
            "duration_days": (
                "Trip kitne din ka hoga?"
                if is_hindi else
                "How many days are you planning for the trip?"
            ),
            "budget": (
                "Total budget kitna rakhna hai? (per person ya total, dono theek hai)"
                if is_hindi else
                "What's your total budget for this trip? (per person or total, either works)"
            ),
        }
        return questions.get(field)

    def _location_value(self, value: Any) -> bool:
        if isinstance(value, dict):
            return bool(value.get("canonical_value") or value.get("canonical") or value.get("raw_value") or value.get("raw"))
        return bool(value)

    def _date_present(self, value: Any) -> bool:
        if isinstance(value, dict):
            return bool(value.get("start") or value.get("month") or value.get("exact_date") or value.get("raw_value"))
        return bool(value)

    def _scalar_value(self, value: Any) -> bool:
        if isinstance(value, dict):
            return value.get("value") is not None
        return value is not None

    def _budget_amount(self, value: Any) -> bool:
        if isinstance(value, dict):
            return value.get("amount") is not None
        return bool(value)
