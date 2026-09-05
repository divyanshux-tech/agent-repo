from pydantic import BaseModel
from typing import List, Optional
from .candidate import FlightCandidate, TrainCandidate, HotelCandidate, ActivityCandidate

class CostEstimate(BaseModel):
    food_estimate_inr: int
    local_transport_estimate_inr: int
    estimation_method: str
    profile_level: str
    confidence: str
    
    @property
    def total_inr(self) -> int:
        return self.food_estimate_inr + self.local_transport_estimate_inr

class Plan(BaseModel):
    travel: FlightCandidate | TrainCandidate
    hotel: HotelCandidate
    activities: List[ActivityCandidate]
    estimated_total_inr: int
    headroom_inr: int
    sustainability_score: float
    crowd_score: float
    
class PlanLabel(BaseModel):
    label: str # BEST_VALUE, BEST_EXPERIENCE, SUSTAINABLE, etc.
    plan: Plan