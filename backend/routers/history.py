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
        # Fetch trips for this user, excluding deleted ones
        res = supabase.table("trips").select("id, source, destination, travel_date, days, status, created_at, updated_at, title, is_pinned, is_archived").eq("user_id", user_id).neq("is_deleted", True).order("is_pinned", desc=True).order("updated_at", desc=True).execute()
        return res.data
    except Exception as e:
        logger.error(f"Failed to fetch history: {e}")
        raise HTTPException(status_code=500, detail="Database error")

from pydantic import BaseModel
class RenameRequest(BaseModel):
    title: str

@router.patch("/{trip_id}/pin")
async def toggle_pin(trip_id: str, user_id: Optional[str] = Query(None), pinned: bool = True):
    if not user_id or user_id.startswith("mock_"):
        raise HTTPException(status_code=401, detail="User ID required")
    supabase = get_supabase()
    try:
        supabase.table("trips").update({"is_pinned": pinned}).eq("id", trip_id).eq("user_id", user_id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")

@router.patch("/{trip_id}/archive")
async def toggle_archive(trip_id: str, user_id: Optional[str] = Query(None), archived: bool = True):
    if not user_id or user_id.startswith("mock_"):
        raise HTTPException(status_code=401, detail="User ID required")
    supabase = get_supabase()
    try:
        supabase.table("trips").update({"is_archived": archived}).eq("id", trip_id).eq("user_id", user_id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")

@router.patch("/{trip_id}/rename")
async def rename_trip(trip_id: str, request: RenameRequest, user_id: Optional[str] = Query(None)):
    if not user_id or user_id.startswith("mock_"):
        raise HTTPException(status_code=401, detail="User ID required")
    supabase = get_supabase()
    try:
        supabase.table("trips").update({"title": request.title}).eq("id", trip_id).eq("user_id", user_id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")

@router.delete("/{trip_id}")
async def delete_trip(trip_id: str, user_id: Optional[str] = Query(None)):
    if not user_id or user_id.startswith("mock_"):
        raise HTTPException(status_code=401, detail="User ID required")
    supabase = get_supabase()
    try:
        supabase.table("trips").update({"is_deleted": True}).eq("id", trip_id).eq("user_id", user_id).execute()
        return {"success": True}
    except Exception as e:
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
