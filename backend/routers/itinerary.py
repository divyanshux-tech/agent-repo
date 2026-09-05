from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from db.supabase_client import supabase
from agents.itinerary import generate_itinerary, regenerate_single_day, ItineraryGenerationError

router = APIRouter(prefix="/api/trips/{trip_id}/itinerary", tags=["itinerary"])

@router.post("/generate")
async def api_generate_itinerary(trip_id: str):
    # Verify trip exists
    trip = supabase.table("trips").select("id").eq("id", trip_id).execute()
    if not trip.data:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    # Check for locked plan
    plan = supabase.table("selected_plans").select("id").eq("trip_id", trip_id).execute()
    if not plan.data:
        raise HTTPException(status_code=409, detail="No locked plan exists for this trip. Select a plan before generating an itinerary.")
        
    try:
        itinerary = await generate_itinerary(trip_id, force_regenerate=True)
        return itinerary.model_dump(mode='json')
    except ItineraryGenerationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except ValueError as e:
        # e.g., validation failed early before generating
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Unexpected internal error")

@router.get("")
async def api_get_itinerary(trip_id: str):
    res = supabase.table("trip_itineraries").select("data_json").eq("trip_id", trip_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="No itinerary exists for this trip.")
    return res.data[0]["data_json"]

@router.post("/days/{day_number}/regenerate")
async def api_regenerate_day(trip_id: str, day_number: int):
    try:
        itinerary = await regenerate_single_day(trip_id, day_number)
        return itinerary.model_dump(mode='json')
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except ItineraryGenerationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Unexpected internal error")
