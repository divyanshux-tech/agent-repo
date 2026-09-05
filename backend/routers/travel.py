from fastapi import APIRouter, Request, HTTPException, Query
from typing import List, Optional
import json

from models.travel_schemas import TravelSearchRequest, TravelSearchResult, TravelCandidate
from agents.travel import run_travel_agent
from db.supabase_client import supabase

router = APIRouter()

@router.post("/search", response_model=TravelSearchResult)
async def search_travel(req: TravelSearchRequest):
    try:
        res = await run_travel_agent(
            trip_id=req.trip_id,
            from_code=req.from_code,
            to_code=req.to_code,
            date=req.date,
            travellers=req.travellers
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.get("/candidates/{candidate_id}", response_model=TravelCandidate)
async def get_candidate(candidate_id: str):
    try:
        # T1, T2 ... but in DB it's stored inside data_json, or we can parse it from data_json.
        # Actually, if we didn't store candidate_id as a separate column, we have to search inside data_json.
        # It's better if we query data_json->>'id'. Supabase allows: eq("data_json->>id", candidate_id)
        # But we don't have exactly that schema. Let's assume we can fetch it like this:
        res = supabase.table("trip_candidates").select("data_json").eq("data_json->>id", candidate_id).is_("superseded_at", "null").execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Candidate not found")
            
        cand_data = json.loads(res.data[0]["data_json"]) if isinstance(res.data[0]["data_json"], str) else res.data[0]["data_json"]
        return TravelCandidate(**cand_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/candidates", response_model=List[TravelCandidate])
async def get_candidates(trip_id: str = Query(...)):
    try:
        res = supabase.table("trip_candidates")\
            .select("data_json")\
            .eq("trip_id", trip_id)\
            .in_("type", ["flight", "train"])\
            .is_("superseded_at", "null")\
            .execute()
            
        cands = []
        for row in res.data:
            cd = json.loads(row["data_json"]) if isinstance(row["data_json"], str) else row["data_json"]
            cands.append(TravelCandidate(**cd))
            
        return cands
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
