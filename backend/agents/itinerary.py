import json
import logging
from datetime import datetime
from pydantic import ValidationError, TypeAdapter

from models.itinerary_schemas import Itinerary
from db.supabase_client import supabase
from services.llm_provider import get_llm_provider
from services.rag_service import answer as rag_answer

logger = logging.getLogger(__name__)

class ItineraryGenerationError(Exception):
    pass

def load_locked_plan(trip_id: str) -> dict:
    # 1. Fetch selected_plans
    res = supabase.table("selected_plans").select("*").eq("trip_id", trip_id).execute()
    if not res.data:
        raise ValueError(f"No locked plan exists for trip {trip_id}. Select a plan before generating an itinerary.")
    return res.data[0]

def _validate_business_rules(itinerary: Itinerary, locked_plan: dict):
    warnings = set(itinerary.warnings)
    
    plan_data = locked_plan.get("data_json", {})
    locked_activities = plan_data.get("activities", [])
    locked_activity_ids = {a["id"] for a in locked_activities}
    
    for i, day in enumerate(itinerary.days):
        has_food = any(s.type == "food" for s in day.slots)
        has_explore = any(s.type == "explore" for s in day.slots)
        
        day_locked_activities = [s for s in day.slots if s.activity_id in locked_activity_ids]
        is_full_day = len(day_locked_activities) == 1 and day_locked_activities[0].end_time and "17:00" <= day_locked_activities[0].end_time
        
        if not has_food:
            warnings.add(f"Day {day.day} is missing a food slot")
            
        if not has_explore and not is_full_day and not day_locked_activities:
            warnings.add(f"Day {day.day} is missing an explore slot")
            
        if i == 0:
            if not any(s.type == "travel" for s in day.slots):
                warnings.add("Day 1 is missing a travel slot")
            if not any(s.type == "checkin" for s in day.slots):
                warnings.add("Day 1 is missing a checkin slot")
        if i == len(itinerary.days) - 1:
            if not any(s.type == "checkout" for s in day.slots):
                warnings.add("Last day is missing a checkout slot")
            if not any(s.type == "travel" for s in day.slots):
                warnings.add("Last day is missing a travel slot")
                
    found_activities = set()
    for day in itinerary.days:
        for slot in day.slots:
            if slot.activity_id:
                found_activities.add(slot.activity_id)
                
    missing_acts = locked_activity_ids - found_activities
    if missing_acts:
        warnings.add(f"Missing locked activities: {missing_acts}")
        
    itinerary.warnings = list(warnings)
    return itinerary

def validate_itinerary_pipeline(response_json: str, locked_plan: dict) -> Itinerary:
    try:
        data = json.loads(response_json)
        itinerary = TypeAdapter(Itinerary).validate_python(data)
        itinerary = _validate_business_rules(itinerary, locked_plan)
        return itinerary
    except ValidationError as e:
        raise ValueError(f"Schema validation failed: {str(e)}")
    except Exception as e:
        raise ValueError(f"Unexpected validation error: {str(e)}")

async def generate_itinerary(trip_id: str, force_regenerate: bool = False) -> Itinerary:
    if not force_regenerate:
        existing = supabase.table("trip_itineraries").select("*").eq("trip_id", trip_id).execute()
        if existing.data:
            return TypeAdapter(Itinerary).validate_python(existing.data[0]["data_json"])

    locked_plan = load_locked_plan(trip_id)
    plan_data = locked_plan.get("data_json", {})
    destination = plan_data.get("destination", "the destination")
    
    trip_res = supabase.table("trips").select("preferred_language").eq("id", trip_id).execute()
    lang = trip_res.data[0].get("preferred_language", "en") if trip_res.data else "en"

    query = f"{destination} logistics landmarks local transport entry fees timings food etiquette activities"
    rag_context = await rag_answer(query, top_k=3)
    
    schema_str = json.dumps(Itinerary.model_json_schema(), indent=2)
    system_prompt = "You are a meticulous Indian travel itinerary writer. You produce time-anchored, day-by-day plans grounded in real places, real transit times, and realistic per-person INR costs."
    
    prompt = f"""
1. SYSTEM ROLE
{system_prompt}

2. LOCKED PLAN
{json.dumps(plan_data, indent=2)}
Preferred Language: {lang} (Output title/descriptions/notes in this language, keep schema keys in English)

3. RAG CONTEXT
Use this context to ground your answer. Do not invent landmarks, entry fees, or transit times.
If the context does not cover a detail, use generic phrasing and set inferred=true.
{rag_context.get('answer', '')}

4. OUTPUT SCHEMA
Return ONLY a JSON object adhering to this schema:
{schema_str}

5. HARD CONSTRAINTS
Use 24h HH:MM times.
India local time.
No invented landmarks.
No invented prices.
Every day's spend must fit within the per-day budget.
Return ONLY the JSON object, no prose.
Every locked activity must appear exactly once.
Day 1 contains arrival travel and check-in.
Final day contains checkout and departure travel.
Every day requires food.
Every day requires exploration unless full-day activity exception applies.
Use INR.
Descriptions should be realistic.
Unknown details must use generic wording.
Do not invent unsupported landmarks, transit times, or entry fees.
"""

    llm = get_llm_provider()
    
    generation_attempts = 0
    last_error = None
    while generation_attempts < 2:
        generation_attempts += 1
        # the llm provider expects the prompt in the system_prompt or user payload
        # Our LLMProvider generate_json has system_prompt and payload (which gets json dumped).
        # But if it's text prompt, we can pass prompt inside the dict.
        response = await llm.generate_json(system_prompt, {"instruction": prompt})
        if not response:
            if generation_attempts >= 2:
                raise ItineraryGenerationError("LLM failed to return a response.")
            continue
            
        try:
            # response is a dict from LLMProvider JSON mode
            itinerary = validate_itinerary_pipeline(json.dumps(response), locked_plan)
            
            # Persist
            supabase.table("trip_itineraries").upsert({
                "trip_id": trip_id,
                "data_json": itinerary.model_dump(mode='json'),
                "language": itinerary.language,
                "total_estimated_spend_inr": itinerary.total_estimated_spend_inr,
                "generation_attempts": generation_attempts,
                "warnings": itinerary.warnings
            }).execute()
            
            return itinerary
        except ValueError as e:
            last_error = str(e)
            prompt += f"\n\nVALIDATION ERROR on previous attempt:\n{last_error}\nPlease return corrected JSON only."
            
    raise ItineraryGenerationError(f"Failed after 2 attempts. Last error: {last_error}")

async def regenerate_single_day(trip_id: str, day_number: int) -> Itinerary:
    existing = supabase.table("trip_itineraries").select("*").eq("trip_id", trip_id).execute()
    if not existing.data:
        raise ValueError("No existing itinerary to regenerate.")
        
    itinerary = TypeAdapter(Itinerary).validate_python(existing.data[0]["data_json"])
    
    if not (1 <= day_number <= len(itinerary.days)):
        raise ValueError("Invalid day_number")
        
    # In a full implementation, we'd only pass the day to the LLM and stitch it back.
    # To satisfy the "only modify one day" rule, we request a single day schema from LLM.
    # We will do a simplistic replacement here to abide by architectural constraints.
    target_day = itinerary.days[day_number - 1]
    
    schema_str = json.dumps(target_day.model_json_schema(), indent=2)
    locked_plan = load_locked_plan(trip_id)
    plan_data = locked_plan.get("data_json", {})
    destination = plan_data.get("destination", "the destination")
    rag_context = await rag_answer(destination, top_k=3)
    
    prompt = f"""
Regenerate ONLY day {day_number}.
Do not modify any other day.
Return ONLY the JSON object for the requested ItineraryDay.

LOCKED PLAN:
{json.dumps(plan_data, indent=2)}

RAG CONTEXT:
{rag_context.get('answer', '')}

OUTPUT SCHEMA:
{schema_str}

HARD CONSTRAINTS:
Return ONLY valid JSON.
Keep Day {day_number} in bounds of original dates.
"""
    llm = get_llm_provider()
    response = await llm.generate_json("You are a meticulous travel itinerary updater.", {"instruction": prompt})
    if not response:
        raise ItineraryGenerationError("LLM failed to regenerate day.")
        
    try:
        from models.itinerary_schemas import ItineraryDay
        new_day = TypeAdapter(ItineraryDay).validate_python(response)
        
        # Stitch back
        itinerary.days[day_number - 1] = new_day
        
        # Re-validate the entire itinerary
        itinerary = validate_itinerary_pipeline(itinerary.model_dump_json(), locked_plan)
        
        # Persist
        supabase.table("trip_itineraries").upsert({
            "trip_id": trip_id,
            "data_json": itinerary.model_dump(mode='json'),
            "language": itinerary.language,
            "total_estimated_spend_inr": itinerary.total_estimated_spend_inr,
            "warnings": itinerary.warnings
        }).execute()
        
        return itinerary
    except Exception as e:
        raise ItineraryGenerationError(f"Failed to regenerate day: {e}")
