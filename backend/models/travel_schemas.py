from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional, Union
from pydantic import BaseModel, Field, field_validator

CandidateType = Literal["flight", "train"]
Provider = Literal["aviationstack", "opensky", "indian_rail"]

class TrainClassOption(BaseModel):
    class_code: Literal["SL", "3A", "2A", "1A", "CC", "EC", "2S"]
    price_inr: int = Field(..., ge=0)
    availability: Literal["available", "rac", "waitlist", "unknown"]

class TravelCandidate(BaseModel):
    id: str
    type: CandidateType
    provider: Provider
    provider_reference: str
    from_code: str = Field(..., min_length=2, max_length=8)
    to_code: str = Field(..., min_length=2, max_length=8)
    departure: datetime
    duration_minutes: int = Field(..., ge=1)
    price_inr: int = Field(..., ge=0)
    carrier: Optional[str] = None
    flight_number: Optional[str] = None
    arrival: Optional[datetime] = None
    stops: Optional[int] = None
    aircraft_type: Optional[str] = None
    train_name: Optional[str] = None
    train_number: Optional[str] = None
    class_options: Optional[list[TrainClassOption]] = None
    expires_at: datetime
    fetched_at: datetime = Field(default_factory=datetime.utcnow)

class TravelSearchRequest(BaseModel):
    # trip_id is optional — sidebar can search without a real trip
    trip_id: Optional[str] = None
    from_code: str
    to_code: str
    date: Union[datetime, str]  # Accept ISO string or datetime
    travellers: int = Field(default=1, ge=1, le=20)

    @field_validator("date", mode="before")
    @classmethod
    def parse_date(cls, v):
        if isinstance(v, str) and v:
            try:
                return datetime.fromisoformat(v.replace("Z", "+00:00"))
            except Exception:
                # Try common formats like YYYY-MM-DD
                from datetime import datetime as dt
                for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
                    try:
                        return dt.strptime(v, fmt)
                    except Exception:
                        continue
        return v

class TravelSearchResult(BaseModel):
    trip_id: Optional[str] = None
    candidates: list[TravelCandidate]
    warnings: list[str]
    fetched_at: datetime
