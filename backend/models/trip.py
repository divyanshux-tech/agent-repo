from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union

class TemporalConstraint(BaseModel):
    raw_utterance: str
    month: Optional[int] = None
    year: Optional[int] = None
    exact_date: Optional[str] = None # e.g., 'YYYY-MM-DD'
    exact_date_known: bool = False
    is_ambiguous: bool = True

class LocationConstraint(BaseModel):
    raw: str
    canonical: Optional[str] = None
    type: Optional[str] = None # city, region, airport, etc.
    confidence: float = 0.0
    is_ambiguous: bool = True

class BudgetConstraint(BaseModel):
    amount: Optional[float] = None
    currency: str = "INR"
    precision: str = "approximate" # exact, approximate
    scope: str = "total" # per_person, total, per_night
    includes: List[str] = [] # flights, hotel, activities

class EntityValue(BaseModel):
    value: Any
    confidence: float
    is_ambiguous: bool = False

class VoiceTripState(BaseModel):
    origin: Optional[LocationConstraint] = None
    destination: Optional[LocationConstraint] = None
    temporal: Optional[TemporalConstraint] = None
    duration_days: Optional[EntityValue] = None
    travellers: Optional[EntityValue] = None
    traveller_type: Optional[EntityValue] = None
    budget: Optional[BudgetConstraint] = None
    transport_preference: Optional[EntityValue] = None
    hotel_preference: Optional[EntityValue] = None
    interests: List[str] = []