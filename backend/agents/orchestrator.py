from typing import List, Optional
from models.chat import Intent, OrchestratorTurnResult, TripRequirements, Message
from services.conversation.nlu_schema import NLUInput
from services.conversation.nlu_service import NLUService
from services.conversation.state_updater import StateUpdater
from services.memory_service import build_memory_context, update_memory
import asyncio

SYSTEM_PROMPT = """
You are a travel planning assistant for India called "Plan Through Us".

Your personality: Warm, efficient, knowledgeable about Indian travel. Never robotic.
You understand Hindi, Hinglish (mixed Hindi-English), and English. Always respond in 
the same language the user writes in. For Hinglish, reply in Hinglish.

YOUR ONLY JOB in this call is to:
1. Parse the user's intent
2. Extract structured trip requirements
3. Identify missing required fields
4. Return a structured JSON response

You are NOT booking anything. You are NOT searching APIs. You are ONLY parsing intent.

Required fields before travel search can begin:
- source (city they're travelling FROM)
- destination OR destination_preference (a preference like "beach" or "offbeat")
- travel_date (specific date or approximate like "next month")  
- days (number of days)
- travellers (number of people)
- total_budget_inr (total budget in Indian Rupees)

Rules:
- Ask for ONLY ONE missing field per turn. Never ask all missing fields at once.
- If the user gives budget in thousands (25k, 30 hazar), convert to integer (25000, 30000).
- If source is not mentioned, assume Delhi (most common for Indian users).
- If days not mentioned but dates given, calculate days.
- Understand Indian city name variations: Bombay=Mumbai, Calcutta=Kolkata, Madras=Chennai, 
  Dilli=Delhi, Poona=Pune, Bengaluru=Bangalore.
- Understand transliterated Hindi: "chahiye"=want, "kitna"=how much, "kab"=when,
  "kahan"=where, "kitne log"=how many people, "hazar"=thousand, "din"=days.

Intent values:
START_PLANNING        - user wants to start planning a new trip
RECOMMEND_DESTINATIONS - user wants destination suggestions ("kahaan jaayein?")
SEARCH_COMPONENTS     - all required fields collected, ready to search
CHANGE_HOTEL          - user wants different hotel options
CHANGE_TRAVEL         - user wants different flight/train options  
CHANGE_ACTIVITY       - user wants different activity options
UPDATE_BUDGET         - user wants to change the budget
REPLAN_ALL            - user wants to start over or change everything
CONFIRM_BOOKING       - user wants to book the selected plan
ASK_KNOWLEDGE         - user asking a factual question about a destination
GET_WEATHER           - user asking about weather at a destination
EXPLAIN_PLAN          - user wants to know why a plan was suggested
GET_ITINERARY         - user wants day-by-day plan generated
GET_PACKING_LIST      - user wants to see their packing checklist
GET_DOCUMENT          - user wants to see their booking confirmation, visa, or travel documents
GET_FLIGHT_STATUS     - user wants to know their flight status

Respond ONLY with valid JSON. No preamble. No markdown. No explanation outside the JSON.
"""

state_updater = StateUpdater()
nlu_service = NLUService()


async def handle_turn(
    message: str,
    history: List[Message],
    user_id: Optional[str] = None,
    trip_id: Optional[str] = None,
    session_id: Optional[str] = None,
    language: Optional[str] = None,
    language_confidence: Optional[float] = None,
    is_code_mixed: Optional[bool] = None,
    current_state: Optional[dict] = None,
) -> OrchestratorTurnResult:
    stored_state = state_updater.load_trip_state(trip_id)
    active_state = state_updater.merge(stored_state, current_state or {})

    nlu_input = NLUInput(
        session_id=session_id,
        conversation_id=trip_id,
        transcript=message,
        language=language or "unknown",
        language_confidence=language_confidence or 0.0,
        is_code_mixed=bool(is_code_mixed),
    )
    
    memory_context = await build_memory_context(user_id)
    nlu = await nlu_service.parse_turn(nlu_input, active_state, history, memory_context)
    updated_state = state_updater.merge(active_state, nlu.state_updates)
    active_trip_id = state_updater.persist_trip_state(
        user_id=user_id,
        trip_id=trip_id,
        state=updated_state,
        transcript=message,
        language=nlu.language,
    )
    updated_state["trip_id"] = active_trip_id or updated_state.get("trip_id")

    if user_id:
        asyncio.create_task(update_memory(user_id, updated_state))

    user_facing_message = nlu.user_facing_message
    requires_clarification = nlu.requires_clarification
    
    if nlu.action.value == "CONFIRM_BOOKING" and user_id and active_trip_id:
        from services.booking_service import revalidate_plan, create_booking
        import logging
        try:
            reval = await revalidate_plan(user_id, active_trip_id)
            agreed_price = updated_state.get("booking", {}).get("agreed_price")
            
            if reval.status == "UNAVAILABLE":
                requires_clarification = True
                user_facing_message = "I'm sorry, but a component in your selected plan is no longer available. Please select a different option or let me help you replan."
            elif reval.status == "CONFIRMATION_REQUIRED" and (agreed_price is None or agreed_price != reval.new_total_inr):
                # Save the new price to state so the next 'Yes' matches it
                updated_state.setdefault("booking", {})["agreed_price"] = reval.new_total_inr
                state_updater.persist_trip_state(user_id, active_trip_id, updated_state, "", "en")
                requires_clarification = True
                diff_text = f"increased by ₹{reval.difference_inr}" if reval.difference_inr > 0 else f"decreased by ₹{-reval.difference_inr}"
                user_facing_message = f"The price has {diff_text}. The updated total is ₹{reval.new_total_inr}. Would you like to continue and book?"
            else:
                price_to_charge = reval.new_total_inr if reval.status == "CONFIRMATION_REQUIRED" else reval.old_total_inr
                booking = await create_booking(user_id, active_trip_id, price_to_charge)
                user_facing_message = f"Your booking is ready! Please complete your payment here: {booking.checkout_url}"
        except Exception as e:
            logging.error(f"Booking failed: {e}")
            user_facing_message = f"I encountered an issue while processing your booking: {str(e)}"

    return OrchestratorTurnResult(
        action=nlu.action.value,
        intent=nlu.intent.value,
        language=nlu.language,
        is_code_mixed=nlu.is_code_mixed,
        nlu=nlu.model_dump(mode="json"),
        updated_state=updated_state,
        trip_id=active_trip_id,
        requires_clarification=requires_clarification,
        missing_required_fields=nlu.missing_required_fields,
        user_facing_message=user_facing_message,
    )


async def handle_chat_turn(request) -> OrchestratorTurnResult:
    return await handle_turn(
        message=request.message,
        history=request.conversation_history,
        user_id=request.user_id,
        trip_id=request.trip_id,
        session_id=request.session_id,
        language=request.language,
        language_confidence=request.language_confidence,
        is_code_mixed=request.is_code_mixed,
        current_state=request.current_state,
    )


async def parse_intent(message: str, history: List[Message]) -> Intent:
    result = await handle_turn(message=message, history=history)
    state = result.updated_state
    return Intent(
        intent=result.action,
        language=result.language,
        trip_requirements=TripRequirements(
            source=_location_name(state.get("origin")),
            destination=_location_name(state.get("destination")),
            travel_date=_travel_date(state.get("travel_dates")),
            days=_scalar_value(state.get("duration_days")),
            travellers=_scalar_value(state.get("travellers")),
            total_budget_inr=(state.get("budget") or {}).get("amount"),
            interests=state.get("interests", []),
            spending_style="standard",
            constraints={
                "constraints": state.get("constraints", []),
                "excluded_preferences": state.get("excluded_preferences", []),
            },
        ),
        missing_required_fields=result.missing_required_fields,
        next_question=result.nlu.get("next_question"),
        user_facing_message=result.user_facing_message,
    )


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
        return value.get("start") or value.get("exact_date") or value.get("raw_value")
    return value
