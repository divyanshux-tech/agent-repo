import json
import os
from models.candidate import CostEstimate

COST_PROFILES = {}

def load_cost_profiles():
    global COST_PROFILES
    path = os.path.join(os.path.dirname(__file__), "..", "data", "cost_profiles.json")
    try:
        with open(path, "r") as f:
            COST_PROFILES = json.load(f)
    except Exception:
        COST_PROFILES = {"default": {"food_per_day_inr": 700, "local_transport_per_day_inr": 500, "profile_level": "standard"}}

# Preload
load_cost_profiles()

def estimate_expenses(destination: str, days: int, travellers: int, spending_style: str = "standard") -> CostEstimate:
    dest_key = (destination or "default").lower()
    profile = COST_PROFILES.get(dest_key, COST_PROFILES["default"])
    
    multiplier = {"budget": 0.7, "standard": 1.0, "premium": 1.5}.get(spending_style, 1.0)
    
    food_per_day = profile["food_per_day_inr"] * multiplier
    transport_per_day = profile["local_transport_per_day_inr"] * multiplier
    
    return CostEstimate(
        food_estimate_inr=int(food_per_day * (days or 3) * (travellers or 1)),
        local_transport_estimate_inr=int(transport_per_day * (days or 3)),
        estimation_method="destination_profile",
        profile_level=spending_style,
        confidence="medium"
    )