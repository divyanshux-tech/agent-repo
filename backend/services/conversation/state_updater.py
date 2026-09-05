from copy import deepcopy
from typing import Any, Optional

from db.supabase_client import supabase


class StateUpdater:
    def merge(self, current_state: Optional[dict[str, Any]], updates: dict[str, Any]) -> dict[str, Any]:
        state = deepcopy(current_state or self.empty_state())

        for key, value in updates.items():
            if value is None:
                continue
            if key in {"constraints", "excluded_preferences", "interests"}:
                state[key] = self._merge_lists(state.get(key, []), value)
            elif isinstance(value, dict) and isinstance(state.get(key), dict):
                nested = deepcopy(state[key])
                nested.update({k: v for k, v in value.items() if v is not None})
                state[key] = nested
            else:
                state[key] = value

        return state

    def empty_state(self) -> dict[str, Any]:
        return {
            "trip_id": None,
            "origin": None,
            "destination": None,
            "travel_dates": {"start": None, "end": None, "month": None, "date_precision": None},
            "duration_days": None,
            "travellers": None,
            "traveller_type": None,
            "budget": {"amount": None, "currency": "INR", "scope": None, "approximate": False},
            "interests": [],
            "constraints": [],
            "transport_preference": None,
            "hotel_preference": None,
            "activity_preference": None,
            "excluded_preferences": [],
            "status": "planning",
        }

    def load_trip_state(self, trip_id: Optional[str]) -> dict[str, Any]:
        state = self.empty_state()
        if not trip_id or not supabase:
            return state

        try:
            trip = supabase.table("trips").select("*").eq("id", trip_id).single().execute()
            if trip.data:
                state.update(
                    {
                        "trip_id": trip.data.get("id"),
                        "origin": self._location(trip.data.get("source")),
                        "destination": self._location(trip.data.get("destination")),
                        "duration_days": self._scalar(trip.data.get("days")),
                        "travellers": self._scalar(trip.data.get("travellers")),
                        "budget": {
                            "amount": trip.data.get("total_budget_inr"),
                            "currency": "INR",
                            "scope": "unknown",
                            "approximate": False,
                        },
                        "status": trip.data.get("status") or "planning",
                    }
                )
                if trip.data.get("travel_date"):
                    state["travel_dates"] = {
                        "start": trip.data["travel_date"],
                        "end": None,
                        "month": None,
                        "date_precision": "day",
                    }

            req = supabase.table("trip_requirements").select("*").eq("trip_id", trip_id).single().execute()
            if req.data:
                state["interests"] = req.data.get("interests") or []
                constraints = req.data.get("constraints") or {}
                state["constraints"] = constraints.get("constraints", [])
                state["excluded_preferences"] = constraints.get("excluded_preferences", [])
                if constraints.get("travel_dates"):
                    state["travel_dates"] = constraints["travel_dates"]
                if constraints.get("budget"):
                    state["budget"].update(constraints["budget"])
        except Exception:
            return state

        return state

    def persist_trip_state(
        self,
        user_id: Optional[str],
        trip_id: Optional[str],
        state: dict[str, Any],
        transcript: str,
        language: str,
    ) -> Optional[str]:
        if not supabase:
            return trip_id

        try:
            trip_payload = {
                "user_id": user_id,
                "source": self._location_name(state.get("origin")),
                "destination": self._location_name(state.get("destination")),
                "travel_date": state.get("travel_dates", {}).get("start"),
                "days": self._scalar_value(state.get("duration_days")),
                "travellers": self._scalar_value(state.get("travellers")),
                "total_budget_inr": state.get("budget", {}).get("amount"),
                "status": state.get("status", "planning"),
            }
            trip_payload = {k: v for k, v in trip_payload.items() if v is not None}

            if trip_id:
                supabase.table("trips").update(trip_payload).eq("id", trip_id).execute()
                active_trip_id = trip_id
            elif user_id:
                created = supabase.table("trips").insert(trip_payload).execute()
                active_trip_id = created.data[0]["id"] if created.data else None
            else:
                active_trip_id = None

            if active_trip_id:
                req_payload = {
                    "trip_id": active_trip_id,
                    "interests": state.get("interests", []),
                    "constraints": {
                        "constraints": state.get("constraints", []),
                        "excluded_preferences": state.get("excluded_preferences", []),
                        "travel_dates": state.get("travel_dates"),
                        "budget": state.get("budget"),
                    },
                    "spending_style": "standard",
                }
                supabase.table("trip_requirements").upsert(req_payload).execute()
                supabase.table("conversations").insert(
                    {
                        "trip_id": active_trip_id,
                        "role": "user",
                        "content": transcript,
                        "language": language,
                    }
                ).execute()
            return active_trip_id or trip_id
        except Exception:
            return trip_id

    def _merge_lists(self, existing: list[Any], incoming: Any) -> list[Any]:
        items = incoming if isinstance(incoming, list) else [incoming]
        result = list(existing)
        for item in items:
            if item not in result:
                result.append(item)
        return result

    def _location(self, value: Optional[str]) -> Optional[dict[str, Any]]:
        if not value:
            return None
        return {"raw_value": value, "canonical_value": value, "type": "city", "confidence": 1.0, "is_ambiguous": False}

    def _scalar(self, value: Any) -> Optional[dict[str, Any]]:
        if value is None:
            return None
        return {"value": value, "confidence": 1.0}

    def _location_name(self, value: Any) -> Optional[str]:
        if isinstance(value, dict):
            return value.get("canonical_value") or value.get("canonical") or value.get("raw_value") or value.get("raw")
        return value

    def _scalar_value(self, value: Any) -> Any:
        if isinstance(value, dict):
            return value.get("value")
        return value
