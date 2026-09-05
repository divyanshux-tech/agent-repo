import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from agents.activity_agent import search_activities
from agents.budget_optimizer import optimize
from agents.hotel_agent import search_hotels
from agents.orchestrator import handle_chat_turn
from agents.travel_agent import search_travel
from models.chat import ChatRequest
from services.estimator_service import estimate_expenses
from services.rag_service import answer
from services.replan_service import ReplanService
from services.estimator_service import estimate_expenses
from services.rag_service import answer

router = APIRouter()


def json_line(data: dict) -> str:
    return json.dumps(data) + "\n"


@router.post("")
async def chat(request: ChatRequest):
    async def event_stream():
        yield json_line({"type": "tool_step", "message": "Understanding your request...", "status": "running"})
        turn = await handle_chat_turn(request)
        yield json_line({"type": "tool_step", "message": "Request understood", "status": "done"})
        yield json_line({"type": "nlu", "data": turn.nlu})

        if turn.requires_clarification:
            yield json_line({"type": "message", "content": turn.user_facing_message, "language": turn.language})
            return

        state = turn.updated_state
        source = _location_name(state.get("origin"))
        destination = _location_name(state.get("destination"))
        travel_date = _travel_date(state.get("travel_dates"))
        days = _scalar_value(state.get("duration_days")) or 3
        travellers = _scalar_value(state.get("travellers")) or 1
        budget = (state.get("budget") or {}).get("amount") or 100000
        interests = state.get("interests", [])
        month = (state.get("travel_dates") or {}).get("month") or 10
        spending_style = "standard"

        if turn.action == "SEARCH_COMPONENTS":
            yield json_line({"type": "tool_step", "message": f"Searching travel to {destination}...", "status": "running"})
            travel_data = await search_travel(source, destination, travel_date, travellers)
            yield json_line({"type": "tool_step", "message": f"Found {len(travel_data['flights'])} flights, {len(travel_data['trains'])} trains", "status": "done"})

            yield json_line({"type": "tool_step", "message": f"Searching hotels in {destination}...", "status": "running"})
            hotels = await search_hotels(destination, travel_date, None, travellers, days)
            yield json_line({"type": "tool_step", "message": f"Found {len(hotels)} stays", "status": "done"})

            yield json_line({"type": "tool_step", "message": "Curating activities...", "status": "running"})
            activities = search_activities(destination, month, interests, budget, travellers)
            yield json_line({"type": "tool_step", "message": f"Found {len(activities)} activities", "status": "done"})

            yield json_line({"type": "tool_step", "message": "Optimizing budget...", "status": "running"})
            estimates = estimate_expenses(destination, days, travellers, spending_style)
            plans = optimize(
                travel_candidates=travel_data["flights"] + travel_data["trains"],
                hotel_candidates=hotels,
                activity_candidates=activities,
                estimated_expenses=estimates,
                total_budget=budget,
            )
            yield json_line({"type": "tool_step", "message": f"Found {len(plans)} feasible plans", "status": "done"})
            yield json_line({"type": "message", "content": turn.user_facing_message, "language": turn.language})
            yield json_line({"type": "plans", "data": [plan.model_dump(mode="json") for plan in plans]})

        elif turn.action in ["CHANGE_HOTEL", "CHANGE_TRAVEL", "CHANGE_ACTIVITY", "UPDATE_BUDGET", "REPLAN_ALL"]:
            yield json_line({"type": "tool_step", "message": f"Replanning based on request...", "status": "running"})
            plans, diff = await ReplanService.handle_replan(request.trip_id, turn.action, state)
            yield json_line({"type": "tool_step", "message": f"Found {len(plans)} feasible plans", "status": "done"})
            yield json_line({"type": "message", "content": turn.user_facing_message, "language": turn.language})
            yield json_line({"type": "replan_diff", "data": diff})
            yield json_line({"type": "plans", "data": [plan.model_dump(mode="json") for plan in plans]})

        elif turn.action == "ASK_KNOWLEDGE":
            rag_response = await answer(request.message)
            yield json_line({
                "type": "knowledge_message", 
                "content": rag_response.get("answer", ""), 
                "language": turn.language,
                "source_type": rag_response.get("source_type"),
                "sources": rag_response.get("sources"),
                "last_updated": rag_response.get("last_updated"),
                "retrieval_confidence": rag_response.get("retrieval_confidence")
            })

        elif turn.action == "GET_WEATHER":
            if not destination:
                yield json_line({"type": "message", "content": turn.user_facing_message or "Which destination do you want to check the weather for?", "language": turn.language})
            else:
                yield json_line({"type": "tool_step", "message": f"Checking weather for {destination}...", "status": "running"})
                from services.weather_service import get_weather
                weather_res = await get_weather(destination, language=turn.language)
                yield json_line({"type": "tool_step", "message": f"Got weather for {destination}", "status": "done"})
                yield json_line({
                    "type": "weather_message", 
                    "content": weather_res.summary, 
                    "language": turn.language,
                    "data": weather_res.model_dump(mode="json")
                })

        elif turn.action == "GET_PACKING_LIST":
            if not request.trip_id:
                yield json_line({"type": "message", "content": "I need a trip context to show your packing list.", "language": turn.language})
            else:
                from services.companion_service import generate_packing_checklist
                checklist = await generate_packing_checklist(request.trip_id)
                yield json_line({
                    "type": "companion_message",
                    "companion_type": "packing_list",
                    "data": checklist.model_dump(mode="json"),
                    "content": "Here is your packing checklist.",
                    "language": turn.language
                })

        elif turn.action == "GET_DOCUMENT":
            if not request.trip_id:
                yield json_line({"type": "message", "content": "I need a trip context to show your documents.", "language": turn.language})
            else:
                from services.companion_service import get_documents
                docs = await get_documents(request.trip_id, request.user_id)
                yield json_line({
                    "type": "companion_message",
                    "companion_type": "documents",
                    "data": [d.model_dump(mode="json") for d in docs],
                    "content": "Here are your trip documents.",
                    "language": turn.language
                })

        elif turn.action == "GET_FLIGHT_STATUS":
            if not request.trip_id:
                yield json_line({"type": "message", "content": "I need a trip context to check flight status.", "language": turn.language})
            else:
                from services.companion_service import get_flight_status
                status = await get_flight_status(request.trip_id)
                if status:
                    yield json_line({
                        "type": "companion_message",
                        "companion_type": "flight_status",
                        "data": status.model_dump(mode="json"),
                        "content": f"Your flight {status.flight_number} is {status.status_label}.",
                        "language": turn.language
                    })
                else:
                    yield json_line({"type": "message", "content": "Live status is unavailable or there is no flight booked for this trip.", "language": turn.language})

        else:
            yield json_line({"type": "message", "content": turn.user_facing_message, "language": turn.language})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _location_name(value):
    if isinstance(value, dict):
        return value.get("canonical_value") or value.get("canonical") or value.get("raw_value") or value.get("raw")
    return value


def _scalar_value(value):
    if isinstance(value, dict):
        return value.get("value")
    return value


def _travel_date(value):
    if isinstance(value, dict):
        return value.get("start") or value.get("exact_date")
    return value
