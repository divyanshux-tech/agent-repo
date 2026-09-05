import asyncio
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Tuple

from core.supabase_client import get_supabase
from agents.hotel_agent import search_hotels
from agents.travel import run_travel_agent
from agents.activity import search_activities
from agents.optimizer import optimize_trip
from models.optimizer_schemas import OptimizerRequest

class ReplanService:
    @staticmethod
    async def handle_replan(trip_id: str, action: str, state: Dict[str, Any]) -> Tuple[List[Any], dict]:
        """
        Runs minimal necessary agents based on action, then invokes optimizer.
        Returns (List of plans, Replan telemetry dict)
        """
        client = get_supabase()
        
        # Extract fields from state
        origin = (state.get("origin") or {}).get("canonical_value", "Delhi")
        destination = (state.get("destination") or {}).get("canonical_value", "Goa")
        
        travel_dates = state.get("travel_dates") or {}
        month = travel_dates.get("month", 10)
        
        if "exact_date" in travel_dates:
            date_str = travel_dates["exact_date"]
            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        else:
            date_obj = date.today() + timedelta(days=14)
            date_str = date_obj.isoformat()
            
        travellers = (state.get("travellers") or {}).get("value", 2)
        days = (state.get("duration_days") or {}).get("value", 4)
        budget = (state.get("budget") or {}).get("amount", 50000)
        interests = state.get("interests", [])
        
        now = datetime.utcnow().isoformat()
        agents_called = []
        agents_skipped = []
        start_time = datetime.now()
        
        # Idempotency / minimum recomputation logic
        if action == "CHANGE_HOTEL":
            agents_called.append("hotel_agent")
            agents_skipped.extend(["travel_agent", "destination_agent", "activity_agent"])
            
            # Supersede old hotel candidates
            if client:
                client.table("trip_candidates").update({"superseded_at": now}).eq("trip_id", trip_id).eq("type", "hotel").is_("superseded_at", "null").execute()
            
            hotels = await search_hotels(destination, date_str, None, travellers, days)
            if client:
                inserts = []
                for h in hotels:
                    inserts.append({
                        "trip_id": trip_id,
                        "type": "hotel",
                        "provider": "mock_hotel",
                        "provider_reference": h.source_reference,
                        "data_json": h.model_dump(mode="json"),
                        "price_inr": h.price_total_inr,
                        "created_at": now
                    })
                client.table("trip_candidates").insert(inserts).execute()
            
        elif action == "CHANGE_TRAVEL":
            agents_called.append("travel_agent")
            agents_skipped.extend(["hotel_agent", "destination_agent", "activity_agent"])
            
            transport_pref = (state.get("transport_preference") or {}).get("value", "both")
            max_flights = 5 if transport_pref in ["both", "flight"] else 0
            max_trains = 5 if transport_pref in ["both", "train"] else 0
            
            await run_travel_agent(
                trip_id=trip_id,
                from_code=origin,
                to_code=destination,
                date=datetime.combine(date_obj, datetime.min.time()),
                travellers=travellers,
                max_flight_results=max_flights,
                max_train_results=max_trains
            )
            
        elif action == "CHANGE_ACTIVITY":
            agents_called.append("activity_agent")
            agents_skipped.extend(["hotel_agent", "travel_agent", "destination_agent"])
            
            await search_activities(
                destination=destination,
                month=month,
                travellers=travellers,
                remaining_budget_inr=budget,
                interests=interests,
                trip_id=trip_id
            )
            
        elif action == "UPDATE_BUDGET":
            agents_skipped.extend(["hotel_agent", "travel_agent", "activity_agent", "destination_agent"])
            # Budget change just triggers optimizer with new bounds
            
        elif action == "REPLAN_ALL":
            agents_called.extend(["hotel_agent", "travel_agent", "activity_agent"])
            agents_skipped.append("destination_agent")
            
            if client:
                client.table("trip_candidates").update({"superseded_at": now}).eq("trip_id", trip_id).is_("superseded_at", "null").execute()
            
            await run_travel_agent(
                trip_id=trip_id, from_code=origin, to_code=destination,
                date=datetime.combine(date_obj, datetime.min.time()), travellers=travellers
            )
            
            hotels = await search_hotels(destination, date_str, None, travellers, days)
            if client:
                inserts = []
                for h in hotels:
                    inserts.append({
                        "trip_id": trip_id, "type": "hotel", "provider": "mock",
                        "provider_reference": h.source_reference, "data_json": h.model_dump(mode="json"),
                        "price_inr": h.price_total_inr, "created_at": now
                    })
                client.table("trip_candidates").insert(inserts).execute()
                
            await search_activities(
                destination=destination,
                month=month,
                travellers=travellers,
                remaining_budget_inr=budget,
                interests=interests,
                trip_id=trip_id
            )
        
        agents_called.append("optimizer")
        
        req = OptimizerRequest(
            trip_id=trip_id,
            destination_slug=destination.lower(),
            start_date=date_obj,
            total_budget_inr=budget,
            user_interests=interests
        )
        plans = optimize_trip(req)
        
        diff = {
            "event": "replan_completed",
            "action": action,
            "agents_called": agents_called,
            "agents_skipped": agents_skipped,
            "duration_ms": int((datetime.now() - start_time).total_seconds() * 1000)
        }
        
        return plans, diff
