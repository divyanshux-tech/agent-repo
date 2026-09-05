from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class VoiceTurn(BaseModel):
    turn_id: str
    session_id: str
    transcript: str
    language: str
    confidence: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class VoiceSessionState(BaseModel):
    session_id: str
    user_id: Optional[str] = None
    turns: List[VoiceTurn] = []
    current_trip_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
