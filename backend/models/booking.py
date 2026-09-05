from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class BookingRevalidationResult(BaseModel):
    status: str # "VALID", "CONFIRMATION_REQUIRED", "UNAVAILABLE"
    old_total_inr: int
    new_total_inr: int
    difference_inr: int
    travel: Dict[str, Any]
    hotel: Dict[str, Any]
    requires_user_confirmation: bool = False
    requires_replan: bool = False
    warnings: List[str] = []

class BookingResult(BaseModel):
    booking_id: str
    status: str
    final_price_inr: int
    provider: str
    provider_confirmation_reference: Optional[str] = None
    checkout_url: Optional[str] = None
