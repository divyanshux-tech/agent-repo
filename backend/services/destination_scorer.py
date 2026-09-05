import json
import os
from typing import List, Dict, Any, Tuple

def get_weights() -> Dict[str, float]:
    """Retrieve scoring weights from environment variable or default."""
    env_weights = os.environ.get("DESTINATION_SER_WEIGHTS")
    if env_weights:
        try:
            return json.loads(env_weights)
        except Exception:
            pass
    return {"alpha": 0.4, "beta": 0.3, "gamma": 0.2, "delta": 0.1}

def interest_match(user_interests: List[str], destination_tags: List[str], best_for_interests: List[str]) -> float:
    """Compute Jaccard similarity between user_interests and (tags U best_for_interests)"""
    if not user_interests:
        return 0.5
    
    user_set = set([i.lower() for i in user_interests])
    dest_set = set([t.lower() for t in destination_tags] + [b.lower() for b in best_for_interests])
    
    intersection = user_set.intersection(dest_set)
    union = user_set.union(dest_set)
    
    jaccard = len(intersection) / len(union) if union else 0.0
    
    best_for_set = set([b.lower() for b in best_for_interests])
    overlap_best = user_set.intersection(best_for_set)
    
    bonus = 0.1 if len(overlap_best) > 0 else 0.0
    return min(1.0, jaccard + bonus)

def season_fit(travel_month: int, season_months: List[int], peak_months: List[int]) -> float:
    if not travel_month:
        return 0.5
        
    if travel_month in season_months:
        if travel_month in peak_months:
            return 1.0
        else:
            return 0.9 # Off-peak bonus
            
    # Check 1 month away
    prev_month = 12 if travel_month == 1 else travel_month - 1
    next_month = 1 if travel_month == 12 else travel_month + 1
    if prev_month in season_months or next_month in season_months:
        return 0.6
        
    # Check 2 months away
    prev2 = 11 if travel_month == 1 else (12 if travel_month == 2 else travel_month - 2)
    next2 = 2 if travel_month == 12 else (1 if travel_month == 11 else travel_month + 2)
    if prev2 in season_months or next2 in season_months:
        return 0.3
        
    return 0.0

def budget_fit(destination_tier: str, total_budget_inr: int, days: int, travellers: int) -> float:
    if not total_budget_inr or not days or not travellers:
        return 0.5 # Neutral if unspecified
        
    # Default configurable mapping
    tier_costs = {
        "budget": 1500,
        "standard": 3500,
        "premium": 7500
    }
    
    target_cost = tier_costs.get(destination_tier.lower(), 3500)
    per_person_per_day = total_budget_inr / (travellers * days)
    
    if per_person_per_day >= 2 * target_cost:
        return 1.0
    if per_person_per_day >= target_cost:
        return 0.8
    if per_person_per_day >= 0.7 * target_cost:
        return 0.5
    return 0.2

def novelty_bonus(footfall: str, user_prefers_offbeat: bool, user_avoids_offbeat: bool = False) -> float:
    if user_avoids_offbeat:
        return 0.1
        
    f = footfall.lower()
    if f == "low":
        return 0.8 if user_prefers_offbeat else 0.5
    if f == "medium":
        return 0.3
    if f == "high":
        return 0.1
        
    return 0.1

import httpx
import asyncio
from datetime import datetime

async def get_weather_signal(dest_name: str, travel_month: int) -> float:
    if not travel_month:
        return 0.0
        
    current_month = datetime.now().month
    if travel_month != current_month:
        return 0.0 # Only apply real-time weather to current month
        
    # Quick geocoding + weather fetch
    # We will use httpx directly to avoid circular imports with weather_service
    # with a very short timeout to not crash the destination scorer
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            geo_res = await client.get(
                "https://geocoding-api.open-meteo.com/v1/search",
                params={"name": dest_name, "count": 1, "language": "en"}
            )
            geo_data = geo_res.json().get("results")
            if not geo_data:
                return 0.0
                
            lat, lon = geo_data[0]["latitude"], geo_data[0]["longitude"]
            
            weather_res = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "daily": "precipitation_sum,temperature_2m_max",
                    "timezone": "Asia/Kolkata",
                    "forecast_days": 3
                }
            )
            w_data = weather_res.json().get("daily", {})
            if not w_data:
                return 0.0
                
            precip = sum(w_data.get("precipitation_sum", [0])) / 3
            temp = sum(w_data.get("temperature_2m_max", [25])) / 3
            
            # Simple heuristic
            signal = 0.0
            if precip > 15: # Heavy rain
                signal -= 0.1
            elif precip < 2 and 20 <= temp <= 30: # Pleasant
                signal += 0.1
                
            return signal
    except Exception:
        # Failsafe: never crash because of weather
        return 0.0

async def score_destination(destination: Dict[str, Any], user_context: Dict[str, Any]) -> Tuple[float, Dict[str, float]]:
    weights = get_weights()
    
    user_interests = user_context.get("interests", [])
    
    # 7. Personalization logic: if we found past interests in memory
    past_interests = user_context.get("past_interests", [])
    
    i_match = interest_match(user_interests, destination.get("tags", []), destination.get("best_for_interests", []))
    
    # Apply personalization bonus
    if past_interests:
        dest_set = set([t.lower() for t in destination.get("tags", [])])
        past_set = set([i.lower() for i in past_interests])
        if len(dest_set.intersection(past_set)) > 0:
            i_match = min(1.0, i_match + 0.05)
    
    s_fit = season_fit(
        user_context.get("travel_month"), 
        destination.get("season_months", []), 
        destination.get("peak_months", [])
    )
    
    b_fit = budget_fit(
        destination.get("typical_cost_tier", "standard"),
        user_context.get("total_budget_inr"),
        user_context.get("days"),
        user_context.get("travellers")
    )
    
    constraints = user_context.get("constraints", {})
    user_prefers_offbeat = "offbeat" in [i.lower() for i in user_interests] or constraints.get("avoid_crowds") is True
    user_avoids_offbeat = constraints.get("no_offbeat") is True
    
    n_bonus = novelty_bonus(destination.get("footfall", "high"), user_prefers_offbeat, user_avoids_offbeat)
    
    total_score = (weights["alpha"] * i_match) + (weights["beta"] * s_fit) + (weights["gamma"] * b_fit) + (weights["delta"] * n_bonus)
    
    # Apply passive weather signal
    w_signal = await get_weather_signal(destination.get("name", ""), user_context.get("travel_month"))
    total_score += w_signal
    
    # Explicit destination match bonus (e.g. "Goa jaana hai")
    query = user_context.get("raw_user_query", "").lower()
    if destination.get("name", "").lower() in query or destination.get("state", "").lower() in query:
        total_score += 2.0  # Massive bonus to ensure it ranks #1
        
    breakdown = {
        "interest_match": round(i_match, 4),
        "season_fit": round(s_fit, 4),
        "budget_fit": round(b_fit, 4),
        "novelty_bonus": round(n_bonus, 4),
        "weather_signal": round(w_signal, 4)
    }
    
    return round(total_score, 4), breakdown
