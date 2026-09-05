from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator

CandidateType = Literal["flight", "train"]
Provider = Literal["aviationstack", "opensky", "indian_rail"]

class TrainClassOption(BaseModel):
    class_code: Literal["SL", "3A", "2A", "1A", "CC", "EC", "2S"]
    price_inr: int = Field(..., ge=0)
    availability: Literal["available", "rac", "waitlist", "unknown"]

class TravelCandidate(BaseModel):
    id: str = Field(..., pattern=r"^T\d+$")  # T1, T2, ...
    type: CandidateType
    provider: Provider
    provider_reference: str  # raw API ID, e.g. AV_abc123, IR_xyz789
    
    # Common travel metadata
    from_code: str = Field(..., min_length=2, max_length=8)  # IATA for flights, NSTC for trains
    to_code: str = Field(..., min_length=2, max_length=8)
    departure: datetime
    duration_minutes: int = Field(..., ge=1)
    price_inr: int = Field(..., ge=0)
    
    # Flight-specific
    carrier: Optional[str] = None
    flight_number: Optional[str] = None
    arrival: Optional[datetime] = None
    stops: Optional[int] = None
    aircraft_type: Optional[str] = None
    
    # Train-specific
    train_name: Optional[str] = None
    train_number: Optional[str] = None
    # arrival is shared above
    class_options: Optional[list[TrainClassOption]] = None
    
    # Lifecycle
    expires_at: datetime
    fetched_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("id")
    @classmethod
    def id_must_be_capital_T(cls, v: str) -> str:
        if not v.startswith("T"):
            raise ValueError("Travel candidate id must start with T")
        return v

class TravelSearchRequest(BaseModel):
    trip_id: str = Field(..., pattern=r"^[0-9a-f-]{36}$")
    from_code: str
    to_code: str
    date: datetime
    travellers: int = Field(..., ge=1, le=20)

class TravelSearchResult(BaseModel):
    trip_id: str
    candidates: list[TravelCandidate]
    warnings: list[str]
    fetched_at: datetime
