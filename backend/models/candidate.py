from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime

class FlightCandidate(BaseModel):
    id: str                          # T1, T2, ...
    type: Literal["flight"] = "flight"
    carrier: str
    from_iata: str
    to_iata: str
    departure: datetime
    arrival: datetime
    duration_minutes: int
    stops: int
    price_inr: int
    baggage: Optional[str] = None
    source_reference: str
    expires_at: datetime

class TrainCandidate(BaseModel):
    id: str                          # T1, T2, ... (same namespace as flights)
    type: Literal["train"] = "train"
    train_name: str
    train_number: str
    from_station: str
    to_station: str
    departure: datetime
    arrival: datetime
    duration_minutes: int
    travel_class: str                # SL | 3A | 2A | 1A
    price_inr: int
    availability: str                # AVAILABLE | WAITING | REGRET
    source_reference: str
    expires_at: datetime

class HotelCandidate(BaseModel):
    id: str                          # H1, H2, ...
    name: str
    lat: float
    lon: float
    category: str                    # hostel | guesthouse | hotel | resort
    rating: Optional[float] = None
    price_total_inr: int             # for full stay (all nights)
    nights: int
    price_band: str                  # budget | standard | premium
    cancellation: str
    source_reference: str

class ActivityCandidate(BaseModel):
    id: str                          # A1, A2, ...
    name: str
    region: str
    category: str
    price_inr: int                   # per person
    duration_hrs: float
    interest_match_score: float      # 0-1
    operator_note: Optional[str] = None
    source_reference: str