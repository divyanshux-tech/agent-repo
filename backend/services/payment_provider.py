import os
import uuid
from typing import Dict, Any

class PaymentProvider:
    async def create_checkout(self, amount_inr: int, reference_id: str) -> Dict[str, Any]:
        raise NotImplementedError

class RazorpayPaymentProvider(PaymentProvider):
    async def create_checkout(self, amount_inr: int, reference_id: str) -> Dict[str, Any]:
        api_key = os.environ.get("RAZORPAY_API_KEY")
        api_secret = os.environ.get("RAZORPAY_API_SECRET")
        
        # Mocking the Razorpay response if keys are missing
        checkout_id = f"pay_{uuid.uuid4().hex[:14]}"
        
        if not api_key or not api_secret:
            return {
                "checkout_id": checkout_id,
                "checkout_url": f"https://mock-razorpay.com/checkout/{checkout_id}",
                "amount_inr": amount_inr
            }
            
        # In a real scenario, make a request to Razorpay Orders API using httpx
        # e.g., POST https://api.razorpay.com/v1/orders
        return {
            "checkout_id": checkout_id,
            "checkout_url": f"https://razorpay.com/checkout/{checkout_id}",
            "amount_inr": amount_inr
        }
