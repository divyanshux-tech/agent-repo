from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import date

class OptimizerRequest(BaseModel):
    trip_id: str
    total_budget_inr: int
    destination_slug: str
    start_date: date
    end_date: date
    user_interests: List[str]

class OptimizerPlanResponse(BaseModel):
    plan_id: str
    trip_id: str
    label: str
    total_cost_inr: int
    savings_vs_budget_inr: int
    composite_score: float
    travel_candidate: Optional[Dict[str, Any]] = None
    hotel_candidate: Optional[Dict[str, Any]] = None
    activities: List[Dict[str, Any]] = []
    expense_estimate: Optional[Dict[str, Any]] = None
    incomplete_components: List[str] = []
