from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    user_id: str
    message: str
    conversation_history: List[Message]
    trip_id: Optional[str] = None
    session_id: Optional[str] = None
    language: Optional[str] = None
    language_confidence: Optional[float] = None
    is_code_mixed: Optional[bool] = None
    current_state: Optional[Dict[str, Any]] = None

class TripRequirements(BaseModel):
    source: Optional[str] = None
    destination: Optional[str] = None
    destination_preference: Optional[str] = None
    travel_date: Optional[str] = None
    days: Optional[int] = None
    travellers: Optional[int] = None
    total_budget_inr: Optional[int] = None
    interests: List[str] = []
    spending_style: str = "standard"
    constraints: Dict[str, Any] = {}

class Intent(BaseModel):
    intent: str
    language: str
    trip_requirements: TripRequirements
    missing_required_fields: List[str] = []
    next_question: Optional[str] = None
    user_facing_message: str

class ChatResponse(BaseModel):
    type: str
    message: Optional[str] = None
    content: Optional[str] = None
    language: Optional[str] = None
    data: Optional[Any] = None
    status: Optional[str] = None

class OrchestratorTurnResult(BaseModel):
    action: str
    intent: str
    language: str
    is_code_mixed: bool = False
    nlu: Dict[str, Any]
    updated_state: Dict[str, Any]
    trip_id: Optional[str] = None
    requires_clarification: bool = False
    missing_required_fields: List[str] = []
    user_facing_message: str
