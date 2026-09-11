import logging
from fastapi import APIRouter, HTTPException, Header, Query
from typing import Optional
from db.supabase_client import get_supabase

router = APIRouter(prefix="/history", tags=["History"])
logger = logging.getLogger(__name__)

@router.get("")
async def get_user_history(user_id: Optional[str] = Query(None)):
    if not user_id or user_id.startswith("mock_"):
        raise HTTPException(status_code=401, detail="User ID required")

    supabase = get_supabase()
    try:
        # Fetch trips for this user
        res = supabase.table("trips").select("id, source, destination, travel_date, days, status, created_at, updated_at").eq("user_id", user_id).order("updated_at", desc=True).execute()
        return res.data
    except Exception as e:
        logger.error(f"Failed to fetch history: {e}")
        raise HTTPException(status_code=500, detail="Database error")

@router.get("/{trip_id}")
async def get_thread_messages(trip_id: str, user_id: Optional[str] = Query(None)):
    if not user_id or user_id.startswith("mock_"):
        raise HTTPException(status_code=401, detail="User ID required")
    
    supabase = get_supabase()
    try:
        # Verify trip belongs to user
        trip_check = supabase.table("trips").select("id").eq("id", trip_id).eq("user_id", user_id).execute()
        if not trip_check.data:
            raise HTTPException(status_code=404, detail="Trip not found")

        # Fetch messages
        res = supabase.table("conversations").select("*").eq("trip_id", trip_id).order("created_at", desc=False).execute()
        
        # Also fetch the trip state from user_trip_memory or trip_requirements
        mem_res = supabase.table("user_trip_memory").select("trip_summary").eq("user_id", user_id).execute()
        
        return {
            "messages": res.data,
            "memory": mem_res.data[0].get("trip_summary") if mem_res.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch thread {trip_id}: {e}")
        raise HTTPException(status_code=500, detail="Database error")
