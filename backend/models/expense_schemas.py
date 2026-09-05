from pydantic import BaseModel, Field
from typing import Literal

class ExpenseEstimateRequest(BaseModel):
    trip_id: str
    destination_slug: str
    nights: int
    travellers: int
    spending_style: Literal["budget", "standard", "premium"]

class ExpenseBreakdown(BaseModel):
    food_estimate_inr: int
    local_transport_estimate_inr: int

class ExpenseEstimateResponse(BaseModel):
    is_estimate: bool = Field(default=True, description="Always true. This is an estimate, not a guaranteed cost.")
    confidence: Literal["low", "medium", "high"]
    estimation_method: str
    notes: str
    breakdown: ExpenseBreakdown
    total_estimate_inr: int
