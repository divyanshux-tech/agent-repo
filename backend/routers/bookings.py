from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from services.companion_service import handle_booking_success
from core.supabase_client import get_supabase
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class BookingRequest(BaseModel):
    trip_id: str
    plan_id: str
    payment_intent: str

@router.post("")
async def create_booking(req: BookingRequest):
    # Mock return
    return {"booking_id": "mock-booking-id", "status": "confirmed"}

@router.post("/{booking_id}/confirm")
async def confirm_booking(booking_id: str, background_tasks: BackgroundTasks):
    client = get_supabase()
    res = client.table("bookings").select("*").eq("id", booking_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    booking = res.data[0]
    trip_id = booking["trip_id"]
    user_id = booking["user_id"]
    
    # Update status to confirmed
    client.table("bookings").update({"status": "confirmed"}).eq("id", booking_id).execute()
    
    # Trigger companion initialization in background
    background_tasks.add_task(handle_booking_success, user_id, trip_id, booking_id)
    
    return {"status": "success", "message": "Booking confirmed"}