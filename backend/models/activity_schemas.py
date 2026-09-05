from pydantic import BaseModel
from typing import List, Optional

class ActivitySearchRequest(BaseModel):
    destination: str
    month: int
    travellers: int
    remaining_budget_inr: int
    interests: List[str] = []
    difficulty_max: Optional[str] = None
    trip_id: Optional[str] = None
