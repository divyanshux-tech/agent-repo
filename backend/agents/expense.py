import json
import os
import time
from typing import Optional

from models.expense_schemas import ExpenseEstimateRequest, ExpenseEstimateResponse, ExpenseBreakdown
from db.supabase_client import supabase

PROFILES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "destination_cost_profiles.json")

STYLE_MULTIPLIERS = {
    "budget": 1.0,
    "standard": 1.5,
    "premium": 2.5
}

# In-memory TTL Cache for idempotency (trip_id, slug, nights, travellers, style) -> (timestamp, response)
_cache = {}
CACHE_TTL = 60

def _get_vehicle_share_factor(travellers: int) -> float:
    if travellers == 1:
        return 0.7
    elif travellers <= 2:
        return 1.0
    elif travellers <= 4:
        return 1.4
    else:
        return 1.8

def load_profiles():
    if not os.path.exists(PROFILES_PATH):
        return []
    with open(PROFILES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def estimate_trip_expenses(req: ExpenseEstimateRequest) -> ExpenseEstimateResponse:
    # 1. Idempotency Check
    cache_key = (req.trip_id, req.destination_slug, req.nights, req.travellers, req.spending_style)
    now = time.time()
    if cache_key in _cache:
        timestamp, cached_resp = _cache[cache_key]
        if now - timestamp < CACHE_TTL:
            return cached_resp

    # 2. Load Profiles
    profiles = load_profiles()
    
    # 3. Find Destination Profile
    profile = next((p for p in profiles if p["slug"] == req.destination_slug), None)
    
    if profile:
        confidence = "medium"
        base_slug = req.destination_slug
    else:
        profile = next((p for p in profiles if p["slug"] == "default"), None)
        confidence = "low"
        base_slug = "default"
        
    if not profile:
        # Extreme fallback if even default is missing
        profile = {
            "food_per_day_inr": 600,
            "local_transport_per_day_inr": 400,
            "notes": "Emergency fallback."
        }
        confidence = "low"
        base_slug = "emergency_default"

    # 4. Apply Multipliers
    style_mult = STYLE_MULTIPLIERS.get(req.spending_style, 1.5)
    share_factor = _get_vehicle_share_factor(req.travellers)
    
    # Food: per-person
    food_total = profile["food_per_day_inr"] * req.nights * req.travellers * style_mult
    
    # Transport: per-vehicle-shared
    transport_total = profile["local_transport_per_day_inr"] * req.nights * share_factor * style_mult
    
    # Math clamping bounds checking
    # Min = nights * 200
    # Max = nights * travellers * 15000
    min_bound = req.nights * 200
    max_bound = req.nights * req.travellers * 15000
    
    total_est = food_total + transport_total
    
    if total_est < min_bound:
        total_est = min_bound
        # Re-allocate roughly 60/40
        food_total = total_est * 0.6
        transport_total = total_est * 0.4
    elif total_est > max_bound:
        total_est = max_bound
        # Re-allocate roughly 60/40
        food_total = total_est * 0.6
        transport_total = total_est * 0.4

    # 5. Build Response
    estimation_method = f"profile:{base_slug}:{req.spending_style}:{style_mult}x"
    
    response = ExpenseEstimateResponse(
        is_estimate=True,
        confidence=confidence,
        estimation_method=estimation_method,
        notes=profile.get("notes", "No notes available."),
        breakdown=ExpenseBreakdown(
            food_estimate_inr=int(food_total),
            local_transport_estimate_inr=int(transport_total)
        ),
        total_estimate_inr=int(total_est)
    )
    
    # 6. Cache it
    _cache[cache_key] = (now, response)
    
    # 7. Persist to Supabase
    # Note: trip_cost_estimates has `trip_id` as PRIMARY KEY, meaning we must UPSERT.
    # The prompt asked for inserting new rows without deleting priors, but DB schema prohibits this.
    # We will use upsert to keep the latest estimate active for the trip.
    if supabase and req.trip_id:
        try:
            supabase.table("trip_cost_estimates").upsert({
                "trip_id": req.trip_id,
                "food_estimate_inr": int(food_total),
                "local_transport_estimate_inr": int(transport_total),
                "estimation_method": estimation_method,
                "profile_level": req.spending_style,
                "confidence": confidence
            }).execute()
        except Exception as e:
            print(f"Failed to persist expense estimate: {e}")
            
    return response
