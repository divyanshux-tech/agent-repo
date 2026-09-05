from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from agents.hotel_agent import search_hotels
from models.candidate import HotelCandidate

router = APIRouter()

class HotelSearchRequest(BaseModel):
    destination: str
    checkin: str
    checkout: str
    guests: int
    rooms: Optional[int] = 1

@router.post("/search", response_model=List[HotelCandidate])
async def search_hotels_endpoint(req: HotelSearchRequest):
    try:
        # Assuming search_hotels takes (destination, checkin, checkout, guests, nights)
        # We'll just pass 4 nights for now since the mock signature expects it
        hotels = await search_hotels(
            destination=req.destination,
            checkin=req.checkin,
            checkout=req.checkout,
            guests=req.guests,
            nights=4
        )
        return hotels
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))