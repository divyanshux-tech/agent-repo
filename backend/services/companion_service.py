import os
import uuid
import json
import logging
import datetime
from typing import List, Optional

import google.generativeai as genai
import cloudinary
import cloudinary.uploader
import requests

from db.supabase_client import get_supabase
from models.companion import PackingChecklist, PackingItem, TripDocument, FlightStatusData

logger = logging.getLogger(__name__)

class CompanionServiceError(Exception):
    pass

def init_cloudinary():
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    api_key = os.environ.get("CLOUDINARY_API_KEY")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET")
    if cloud_name and api_key and api_secret:
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret
        )

async def generate_packing_checklist(trip_id: str) -> PackingChecklist:
    """Generates a packing checklist using Gemini for the given trip."""
    client = get_supabase()
    
    # Check if already exists
    res = client.table("trip_checklists").select("*").eq("trip_id", trip_id).execute()
    if res.data:
        data = res.data[0]["data_json"]
        return PackingChecklist(**data)
        
    # Fetch trip details
    trip_res = client.table("trips").select("*").eq("id", trip_id).execute()
    if not trip_res.data:
        raise CompanionServiceError("Trip not found")
    trip = trip_res.data[0]
    
    dest = trip.get("destination", "Unknown")
    days = trip.get("days", 3)
    
    prompt = f"""
    You are a travel assistant. Generate a packing checklist for a {days}-day trip to {dest}.
    Output MUST be a JSON array of objects. Each object should have:
    - id (string, unique like 'item-1')
    - name (string)
    - category (string, e.g., 'Documents', 'Electronics', 'Clothing', 'Toiletries', 'Miscellaneous')
    - quantity (int)
    - reason (string, why it's needed)
    - required (boolean)
    
    Do not wrap in markdown tags like ```json. Output ONLY raw JSON.
    """
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key":
        # Mock response
        items = [
            {"id": "item-1", "name": "ID Proof", "category": "Documents", "quantity": 1, "reason": "Verification", "required": True},
            {"id": "item-2", "name": "Sunscreen", "category": "Toiletries", "quantity": 1, "reason": "Sun protection", "required": False},
        ]
    else:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content(prompt)
            items = json.loads(response.text.strip("```json\n").strip("```"))
        except Exception as e:
            logger.error(f"Failed to generate checklist with Gemini: {e}")
            items = []
            
    packing_items = []
    for it in items:
        packing_items.append(PackingItem(
            id=it.get("id", str(uuid.uuid4())),
            name=it.get("name", "Unknown item"),
            category=it.get("category", "Miscellaneous"),
            quantity=it.get("quantity", 1),
            reason=it.get("reason"),
            required=it.get("required", False),
            checked=False
        ))
        
    checklist = PackingChecklist(
        trip_id=trip_id,
        destination=dest,
        trip_type="Standard",
        duration_days=days,
        items=packing_items,
        generated_at=datetime.datetime.now().isoformat()
    )
    
    # Save to db
    client.table("trip_checklists").insert({
        "trip_id": trip_id,
        "data_json": checklist.model_dump(mode="json"),
        "language": "en"
    }).execute()
    
    return checklist

async def update_packing_item(trip_id: str, item_id: str, checked: bool) -> PackingChecklist:
    client = get_supabase()
    res = client.table("trip_checklists").select("*").eq("trip_id", trip_id).execute()
    if not res.data:
        raise CompanionServiceError("Checklist not found")
        
    checklist_row = res.data[0]
    data = checklist_row["data_json"]
    
    updated = False
    for item in data.get("items", []):
        if item.get("id") == item_id:
            item["checked"] = checked
            updated = True
            break
            
    if not updated:
        raise CompanionServiceError("Item not found in checklist")
        
    client.table("trip_checklists").update({
        "data_json": data,
        "updated_at": datetime.datetime.now().isoformat()
    }).eq("trip_id", trip_id).execute()
    
    return PackingChecklist(**data)

async def upload_document(trip_id: str, user_id: str, file_path: str, original_name: str, mime_type: str, doc_type: str, booking_id: Optional[str] = None) -> TripDocument:
    init_cloudinary()
    if not os.environ.get("CLOUDINARY_CLOUD_NAME"):
        logger.error("Cloudinary not configured.")
        raise CompanionServiceError("Document upload not configured")
        
    try:
        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(
            file_path,
            resource_type="auto",
            folder=f"trips/{trip_id}/documents"
        )
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        raise CompanionServiceError("Failed to upload document")
        
    secure_url = upload_result.get("secure_url")
    public_id = upload_result.get("public_id")
    
    doc_id = str(uuid.uuid4())
    client = get_supabase()
    
    doc_data = {
        "id": doc_id,
        "trip_id": trip_id,
        "booking_id": booking_id,
        "user_id": user_id,
        "document_type": doc_type,
        "file_name": original_name,
        "mime_type": mime_type,
        "cloudinary_public_id": public_id,
        "secure_url": secure_url,
        "source": "booking" if booking_id else "user"
    }
    
    res = client.table("trip_documents").insert(doc_data).execute()
    return TripDocument(**res.data[0])

async def get_documents(trip_id: str, user_id: str) -> List[TripDocument]:
    client = get_supabase()
    res = client.table("trip_documents").select("*").eq("trip_id", trip_id).eq("user_id", user_id).execute()
    return [TripDocument(**row) for row in res.data]

async def get_flight_status(trip_id: str) -> Optional[FlightStatusData]:
    client = get_supabase()
    
    # Find the booked flight candidate
    plan_res = client.table("selected_plans").select("plan_id").eq("trip_id", trip_id).execute()
    if not plan_res.data:
        return None
    plan_id = plan_res.data[0]["plan_id"]
    
    tp_res = client.table("trip_plans").select("travel_candidate_id").eq("id", plan_id).execute()
    if not tp_res.data:
        return None
    travel_cand_id = tp_res.data[0].get("travel_candidate_id")
    if not travel_cand_id:
        return None
        
    tc_res = client.table("trip_candidates").select("*").eq("id", travel_cand_id).execute()
    if not tc_res.data:
        return None
        
    travel_data = tc_res.data[0]
    # For now, let's mock OpenSky since we don't have exact flight mapping in travel_data
    # In a real app we would use travel_data["source_reference"] or similar to get the flight number
    
    return FlightStatusData(
        booking_id="unknown",
        flight_number="6E123",
        status="on_time",
        status_label="On time",
        departure={
            "airport": travel_data.get("provider", "DEL"),
            "scheduled": datetime.datetime.now().isoformat()
        },
        arrival={
            "airport": "GOI",
            "scheduled": (datetime.datetime.now() + datetime.timedelta(hours=2)).isoformat()
        },
        last_updated=datetime.datetime.now().isoformat()
    )

async def handle_booking_success(user_id: str, trip_id: str, booking_id: str):
    """Triggered after booking success."""
    logger.info(f"Booking {booking_id} successful for trip {trip_id}. Initializing companion.")
    try:
        await generate_packing_checklist(trip_id)
    except Exception as e:
        logger.error(f"Failed to generate checklist during booking success: {e}")
        
    # We could also trigger automated PDF generation or retrieval for booking confirmation here.
    logger.info(f"Companion initialization completed for trip {trip_id}.")
