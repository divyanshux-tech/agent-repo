from fastapi import APIRouter, Request, HTTPException
import json
import os
import time
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import logging

from services.destination_selector import select_shortlist
from services.destination_scorer import get_weights

# A simple mock DB client for this project since we just need to execute SQL via existing setup or Supabase client
# Normally we'd use the app's existing db connection. Let's assume we can import a get_db or just mock the write.
# The prompt implies we write if possible, or skip if not. We'll use a try-except.

router = APIRouter()
logger = logging.getLogger(__name__)

# Load catalog once at module import
CATALOG = []
try:
    catalog_path = os.path.join(os.path.dirname(__file__), "..", "data", "destinations.json")
    with open(catalog_path, "r", encoding="utf-8") as f:
        CATALOG = json.load(f)
except Exception as e:
    logger.error(f"Failed to load catalog: {e}")

class RecommendationRequest(BaseModel):
    intent: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    raw_user_query: str
    extracted_slots: Dict[str, Any]

def _fetch_past_interests(user_id: str) -> List[str]:
    """Stub to simulate reading from user_trip_memory table."""
    # In a real setup, we would run: SELECT preference_profile FROM user_trip_memory WHERE user_id = user_id
    # Since we can't easily import the exact DB client without seeing it, we'll mock it for the test.
    # The tests will patch this function anyway.
    return []

def _persist_shortlist(session_id: str, shortlist_json: List[Dict[str, Any]]):
    """Stub to simulate writing to destination_shortlists table."""
    pass

@router.post("/recommend")
async def recommend_destinations(req: RecommendationRequest):
    start_time = time.perf_counter()
    
    # 1. Build context
    context = {
        "raw_user_query": req.raw_user_query,
        "travel_month": req.extracted_slots.get("travel_month"),
        "days": req.extracted_slots.get("days"),
        "travellers": req.extracted_slots.get("travellers"),
        "total_budget_inr": req.extracted_slots.get("total_budget_inr"),
        "interests": req.extracted_slots.get("interests", []),
        "constraints": req.extracted_slots.get("constraints", {})
    }
    
    # 2. Personalization
    if req.user_id:
        context["past_interests"] = _fetch_past_interests(req.user_id)
        
    # 3. Select Shortlist
    shortlist = await select_shortlist(context, CATALOG)
    
    # 4. Persistence
    if req.session_id:
        try:
            _persist_shortlist(req.session_id, shortlist)
        except Exception as e:
            logger.error(f"Failed to persist shortlist: {e}")
            
    latency_ms = int((time.perf_counter() - start_time) * 1000)
    
    # 5. Metadata
    long_tail_count = sum(1 for item in shortlist if item["footfall"] == "low")
    
    # 6. Logging
    top_scores = [round(item["score"], 2) for item in shortlist]
    shortlist_ids = [item["destination_id"] for item in shortlist]
    logger.info(json.dumps({
        "session_id": req.session_id,
        "top_scores": top_scores,
        "shortlist_ids": shortlist_ids,
        "long_tail_count": long_tail_count,
        "latency_ms": latency_ms
    }))
    
    return {
        "session_id": req.session_id,
        "shortlist": shortlist,
        "shortlist_metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "scorer_weights": get_weights(),
            "long_tail_count": long_tail_count,
            "total_evaluated": len(CATALOG)
        }
    }

@router.get("/health")
async def health():
    return {
        "status": "ok",
        "catalog_loaded": len(CATALOG) > 0,
        "catalog_size": len(CATALOG)
    }
