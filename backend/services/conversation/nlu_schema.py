from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class NLUAction(str, Enum):
    START_PLANNING = "START_PLANNING"
    RECOMMEND_DESTINATIONS = "RECOMMEND_DESTINATIONS"
    SEARCH_COMPONENTS = "SEARCH_COMPONENTS"
    CHANGE_HOTEL = "CHANGE_HOTEL"
    CHANGE_TRAVEL = "CHANGE_TRAVEL"
    CHANGE_ACTIVITY = "CHANGE_ACTIVITY"
    UPDATE_BUDGET = "UPDATE_BUDGET"
    REPLAN_ALL = "REPLAN_ALL"
    CONFIRM_BOOKING = "CONFIRM_BOOKING"
    ASK_KNOWLEDGE = "ASK_KNOWLEDGE"
    GET_WEATHER = "GET_WEATHER"
    EXPLAIN_PLAN = "EXPLAIN_PLAN"
    GET_ITINERARY = "GET_ITINERARY"
    UNKNOWN = "UNKNOWN"


class LocationEntity(BaseModel):
    raw_value: Optional[str] = None
    canonical_value: Optional[str] = None
    type: Optional[str] = None
    confidence: float = 0.0
    is_ambiguous: bool = False


class TravelDateEntity(BaseModel):
    start: Optional[str] = None
    end: Optional[str] = None
    month: Optional[int] = None
    week_of_month: Optional[int] = None
    precision: Optional[str] = None
    raw_value: Optional[str] = None


class BudgetEntity(BaseModel):
    amount: Optional[int] = None
    currency: str = "INR"
    scope: str = "unknown"
    operator: Optional[str] = None
    approximate: bool = False


class ScalarEntity(BaseModel):
    value: Any = None
    confidence: float = 0.0
    raw_value: Optional[str] = None


class NLUEntities(BaseModel):
    origin: Optional[LocationEntity] = None
    destination: Optional[LocationEntity] = None
    travel_dates: Optional[TravelDateEntity] = None
    duration_days: Optional[ScalarEntity] = None
    travellers: Optional[ScalarEntity] = None
    traveller_type: Optional[ScalarEntity] = None
    budget: Optional[BudgetEntity] = None
    interests: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    excluded_preferences: list[str] = Field(default_factory=list)
    transport_preference: Optional[ScalarEntity] = None
    hotel_preference: Optional[ScalarEntity] = None
    activity_preference: Optional[ScalarEntity] = None
    target_candidate_reference: Optional[str] = None


class NLUInput(BaseModel):
    session_id: Optional[str] = None
    conversation_id: Optional[str] = None
    turn_id: Optional[str] = None
    transcript: str
    language: str = "unknown"
    language_confidence: float = 0.0
    is_code_mixed: bool = False


class NLUResult(BaseModel):
    intent: NLUAction
    action: NLUAction
    confidence: float = 0.0
    language: str = "unknown"
    is_code_mixed: bool = False
    raw_transcript: str
    entities: NLUEntities = Field(default_factory=NLUEntities)
    state_updates: dict[str, Any] = Field(default_factory=dict)
    missing_required_fields: list[str] = Field(default_factory=list)
    requires_clarification: bool = False
    next_question: Optional[str] = None
    user_facing_message: str = ""
