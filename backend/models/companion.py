from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class PackingItem(BaseModel):
    id: str
    name: str
    category: str
    quantity: int = 1
    reason: Optional[str] = None
    required: bool = False
    checked: bool = False

class PackingChecklist(BaseModel):
    trip_id: str
    destination: str
    trip_type: str
    duration_days: int
    items: List[PackingItem]
    generated_at: str

class TripDocument(BaseModel):
    id: str
    trip_id: str
    booking_id: Optional[str] = None
    user_id: str
    document_type: str
    file_name: str
    mime_type: str
    cloudinary_public_id: str
    secure_url: Optional[str] = None
    source: str
    created_at: datetime
    updated_at: datetime

class FlightStatusData(BaseModel):
    booking_id: str
    flight_number: str
    status: str
    status_label: str
    departure: dict
    arrival: dict
    last_updated: str
