from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime

from models.activity_schemas import ActivitySearchRequest
from models.candidate import ActivityCandidate
from agents.activity import search_activities, get_featured_activities

router = APIRouter()

@router.post("/search", response_model=List[ActivityCandidate])
async def search_activities_endpoint(req: ActivitySearchRequest):
    try:
        results = await search_activities(
            destination=req.destination,
            month=req.month,
            travellers=req.travellers,
            remaining_budget_inr=req.remaining_budget_inr,
            interests=req.interests,
            difficulty_max=req.difficulty_max,
            trip_id=req.trip_id
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/featured")
async def featured_activities_endpoint(month: int = None):
    try:
        if month is None:
            month = datetime.now().month
        return get_featured_activities(month)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
