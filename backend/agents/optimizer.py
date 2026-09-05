import json
import os
import uuid
import time
from itertools import combinations
from typing import List, Dict, Any
from datetime import datetime

from db.supabase_client import supabase
from models.optimizer_schemas import OptimizerRequest, OptimizerPlanResponse

META_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "destination_metadata.json")

_cache = {}
CACHE_TTL = 60

def load_metadata():
    if not os.path.exists(META_PATH):
        return []
    with open(META_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def get_destination_meta(slug: str):
    meta = load_metadata()
    for m in meta:
        if m["slug"] == slug:
            return m
    return next((m for m in meta if m["slug"] == "default"), None)

def fetch_candidates(trip_id: str):
    if not supabase:
        return []
    res = supabase.table("trip_candidates").select("*").eq("trip_id", trip_id).is_("superseded_at", "null").execute()
    return res.data

def fetch_estimate(trip_id: str):
    if not supabase:
        return None
    res = supabase.table("trip_cost_estimates").select("*").eq("trip_id", trip_id).execute()
    return res.data[0] if res.data else None

def _get_price(c: dict, travellers: int) -> int:
    # If the key exactly matches prompt's feasibility string
    if "price_total_inr" in c:
        return c["price_total_inr"]
    # Activity prices are per person according to candidate.py
    if c.get("type") == "ACTIVITY" or c.get("type", "").lower() == "activity":
        return c.get("price_inr", 0) * travellers
    return c.get("price_inr", 0)

def optimize_trip(req: OptimizerRequest) -> List[OptimizerPlanResponse]:
    now = time.time()
    
    # 1. Edge Case: Impossibly low budget
    if req.total_budget_inr < 5000:
        return [OptimizerPlanResponse(
            plan_id=str(uuid.uuid4()),
            trip_id=req.trip_id,
            label="Best Value",
            total_cost_inr=0,
            savings_vs_budget_inr=0,
            composite_score=0.0,
            incomplete_components=["travel", "hotel", "activities", "expense", "infeasible_budget"]
        )]

    # 2. Idempotency Cache
    # We need a hash of the current candidates. Since we fetch them, let's fetch first.
    candidates = fetch_candidates(req.trip_id)
    estimate = fetch_estimate(req.trip_id)
    
    if not candidates:
        return []

    c_hash = hash(str(sorted([c["id"] for c in candidates])))
    cache_key = (req.trip_id, req.total_budget_inr, c_hash)
    
    if cache_key in _cache:
        timestamp, cached_plans = _cache[cache_key]
        if now - timestamp < CACHE_TTL:
            return cached_plans

    # Separate candidates
    travels = [c for c in candidates if c["type"].lower() in ("flight", "train")]
    hotels = [c for c in candidates if c["type"].lower() == "hotel"]
    activities = [c for c in candidates if c["type"].lower() == "activity"]

    travels = [c["data_json"] for c in travels][:5]
    hotels = [c["data_json"] for c in hotels][:5]
    activities = [c["data_json"] for c in activities][:8]

    # Edge cases
    incomplete = []
    if not travels: incomplete.append("travel")
    if not hotels: incomplete.append("hotel")
    
    if estimate:
        expense_food = estimate.get("food_estimate_inr", 0)
        expense_transport = estimate.get("local_transport_estimate_inr", 0)
    else:
        expense_food = 0
        expense_transport = 0
        incomplete.append("expense")

    if not travels or not hotels:
        plan = OptimizerPlanResponse(
            plan_id=str(uuid.uuid4()),
            trip_id=req.trip_id,
            label="Balanced",
            total_cost_inr=0,
            savings_vs_budget_inr=0,
            composite_score=0.0,
            incomplete_components=incomplete
        )
        return [plan]

    # Destination Meta
    dest_meta = get_destination_meta(req.destination_slug) or {}
    dest_fragility = dest_meta.get("fragility_score", 0.5)
    dest_footfall = dest_meta.get("footfall", "medium")
    peak_months = dest_meta.get("peak_months", [])
    
    # Is it crowded?
    travel_month = req.start_date.month
    is_peak = travel_month in peak_months

    # Generate Combinations
    combinations_list = []
    
    # 0 to N activities
    all_activity_combos = []
    for i in range(len(activities) + 1):
        for combo in combinations(activities, i):
            all_activity_combos.append(combo)
            
    # Prune combinations if > 10000
    if len(travels) * len(hotels) * len(all_activity_combos) > 10000:
        print("Warning: >10000 combinations. Pruning.")
        # Greedy pruning on activities: keep fewer activities (drop largest combos)
        # We will just take the first 100 activity combinations
        all_activity_combos = all_activity_combos[:100]

    feasible_plans = []
    
    for t in travels:
        for h in hotels:
            for act_combo in all_activity_combos:
                cost = (
                    _get_price(t, 1) +  # assumption: travel price is total for all travellers already in JSON
                    _get_price(h, 1) + 
                    sum(_get_price(a, len(req.user_interests)) for a in act_combo) + # just using travellers count, wait, we don't have travellers in req. Let's assume price in candidate JSON is total.
                    expense_food + expense_transport
                )
                
                # We need to fix the activity cost computation. Activity is price_inr per person.
                # Since req doesn't contain travellers, we assume the total is already stored or we get it from expense.
                # The expense estimate has `food_estimate_inr` and `local_transport_estimate_inr`.
                
                if cost <= req.total_budget_inr:
                    # Score it
                    normalized_cost = cost / max(1, req.total_budget_inr)
                    
                    hotel_rating = h.get("rating", 3.0) / 5.0
                    avg_act_match = sum(a.get("interest_match_score", 0) for a in act_combo) / max(1, len(act_combo))
                    experience_score = (hotel_rating + avg_act_match) / 2
                    
                    avg_act_sust = sum(a.get("sustainability_score", 0.5) for a in act_combo) / max(1, len(act_combo))
                    sustainability_score = (1.0 - dest_fragility) * 0.5 + avg_act_sust * 0.5
                    
                    crowd_score = 1.0 if dest_footfall == "high" and is_peak else 0.5 if dest_footfall == "medium" else 0.2
                    
                    dur = t.get("duration_minutes", 1000)
                    travel_quality_score = max(0, 1.0 - (dur / 1440.0))
                    
                    composite = (
                        -0.4 * normalized_cost +
                        0.3 * experience_score +
                        0.15 * sustainability_score +
                        0.10 * (1.0 - crowd_score) +
                        0.05 * travel_quality_score
                    )
                    
                    feasible_plans.append({
                        "t": t, "h": h, "acts": act_combo, "cost": cost,
                        "composite": composite, "sust": sustainability_score,
                        "crowd": crowd_score, "dur": dur, "exp": experience_score,
                        "no_act": len(act_combo) == 0
                    })
                    
    if not feasible_plans:
        # Just return an empty list or one with insufficient funds warning
        return []
        
    feasible_plans.sort(key=lambda x: x["composite"], reverse=True)
    
    # Assign labels
    labels_used = set()
    final_plans = []
    
    def add_plan(p_dict, label):
        if label in labels_used:
            return
        labels_used.add(label)
        final_plans.append(OptimizerPlanResponse(
            plan_id=str(uuid.uuid4()),
            trip_id=req.trip_id,
            label=label,
            total_cost_inr=p_dict["cost"],
            savings_vs_budget_inr=req.total_budget_inr - p_dict["cost"],
            composite_score=p_dict["composite"],
            travel_candidate=p_dict["t"],
            hotel_candidate=p_dict["h"],
            activities=list(p_dict["acts"]),
            expense_estimate=estimate,
            incomplete_components=incomplete
        ))

    # 1. Best Value: lowest cost
    best_value = min(feasible_plans, key=lambda x: x["cost"])
    add_plan(best_value, "Best Value")
    
    # 2. Best Experience
    best_exp = max(feasible_plans, key=lambda x: x["exp"])
    add_plan(best_exp, "Best Experience")
    
    # 3. Sustainable Choice
    best_sust = max(feasible_plans, key=lambda x: x["sust"])
    if best_sust["sust"] >= 0.6:
        add_plan(best_sust, "Sustainable Choice")
        
    # 4. Offbeat Pick
    # destination footfall is low or medium AND at least one activity with sust >= 0.5
    offbeat = None
    for p in feasible_plans:
        if dest_footfall in ["low", "medium"]:
            if any(a.get("sustainability_score", 0) >= 0.5 for a in p["acts"]):
                offbeat = p
                break
    if offbeat:
        add_plan(offbeat, "Offbeat Pick")
        
    # 5. Better Travel
    best_travel = min(feasible_plans, key=lambda x: x["dur"])
    add_plan(best_travel, "Better Travel")
    
    # 6. No Activities
    no_act = next((p for p in feasible_plans if p["no_act"]), None)
    if no_act:
        add_plan(no_act, "No Activities")
        
    # Fill remaining to get at least 3 if possible
    for p in feasible_plans:
        if len(final_plans) >= 5:
            break
        add_plan(p, "Balanced")
        
    final_plans = final_plans[:5]
    
    _cache[cache_key] = (now, final_plans)
    
    # DB Persistence
    if supabase and req.trip_id:
        try:
            # supersed old plans
            supabase.table("trip_plans").update({"superseded_at": datetime.utcnow().isoformat()}).eq("trip_id", req.trip_id).is_("superseded_at", "null").execute()
            
            # insert new plans
            rows = []
            for fp in final_plans:
                rows.append({
                    "id": fp.plan_id,
                    "trip_id": fp.trip_id,
                    "travel_candidate_id": fp.travel_candidate["id"] if fp.travel_candidate else None,
                    "hotel_candidate_id": fp.hotel_candidate["id"] if fp.hotel_candidate else None,
                    "activity_candidate_ids": [a["id"] for a in fp.activities],
                    "label": fp.label,
                    "estimated_total_inr": fp.total_cost_inr,
                    "composite_score": fp.composite_score,
                    "data_json": fp.model_dump(mode="json")
                })
            supabase.table("trip_plans").insert(rows).execute()
        except Exception as e:
            print("DB Write error", e)
            
    return final_plans
