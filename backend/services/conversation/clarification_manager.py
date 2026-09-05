from typing import Any


class ClarificationManager:
    REQUIRED_FIELDS = ["destination", "travel_dates", "duration_days", "travellers", "origin", "budget"]

    def missing_fields(self, state: dict[str, Any], action: str) -> list[str]:
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
        }:
            return []

        missing = []
        if not self._location_value(state.get("destination")) and not state.get("destination_preference"):
            missing.append("destination")
        if not self._date_present(state.get("travel_dates")):
            missing.append("travel_dates")
        if not self._scalar_value(state.get("duration_days")):
            missing.append("duration_days")
        if not self._scalar_value(state.get("travellers")):
            missing.append("travellers")
        if not self._location_value(state.get("origin")):
            missing.append("origin")
        if not self._budget_amount(state.get("budget")):
            missing.append("budget")
        return missing

    def next_question(self, missing: list[str], language: str = "hinglish") -> str | None:
        if not missing:
            return None

        field = missing[0]
        hinglish = language in {"hinglish", "hi-en", "hi", "unknown"}
        questions = {
            "destination": "Aap kahaan jaana chahte hain?" if hinglish else "Where would you like to go?",
            "travel_dates": "Aap kis month ya date ke aas-paas travel karna chahte hain?" if hinglish else "When would you like to travel?",
            "duration_days": "Trip kitne din ke liye plan karna hai?" if hinglish else "How many days should I plan for?",
            "travellers": "Kitne log travel karenge?" if hinglish else "How many people are travelling?",
            "origin": "Aap kahaan se start karenge?" if hinglish else "Which city will you start from?",
            "budget": "Total budget kitna rakhna hai?" if hinglish else "What total budget should I plan around?",
        }
        return questions.get(field)

    def _location_value(self, value: Any) -> bool:
        if isinstance(value, dict):
            return bool(value.get("canonical_value") or value.get("canonical") or value.get("raw_value") or value.get("raw"))
        return bool(value)

    def _date_present(self, value: Any) -> bool:
        if isinstance(value, dict):
            return bool(value.get("start") or value.get("month") or value.get("exact_date"))
        return bool(value)

    def _scalar_value(self, value: Any) -> bool:
        if isinstance(value, dict):
            return value.get("value") is not None
        return value is not None

    def _budget_amount(self, value: Any) -> bool:
        if isinstance(value, dict):
            return value.get("amount") is not None
        return bool(value)
