import json
import os
from typing import List, Dict, Optional
from functools import lru_cache

from models.candidate import FlightCandidate, TrainCandidate, HotelCandidate, ActivityCandidate
from models.plan import Plan, PlanLabel, CostEstimate

# Load destination data once
_DESTINATION_DATA: Optional[List[Dict]] = None

def _load_destination_data() -> List[Dict]:
    global _DESTINATION_DATA
    if _DESTINATION_DATA is None:
        try:
            data_path = os.path.join(os.path.dirname(__file__), "..", "data", "destinations.json")
            with open(data_path, "r", encoding="utf-8") as f:
                _DESTINATION_DATA = json.load(f)
        except Exception as e:
            print(f"Failed to load destination data: {e}")
            _DESTINATION_DATA = []
    return _DESTINATION_DATA

@lru_cache(maxsize=128)
def _get_destination_info(destination_id: str) -> Optional[Dict]:
    """Get destination info by ID"""
    data = _load_destination_data()
    for dest in data:
        if dest.get("id") == destination_id:
            return dest
    return None

def _get_destination_by_name(destination_name: str) -> Optional[Dict]:
    """Find destination by name (fuzzy match)"""
    if not destination_name:
        return None
    data = _load_destination_data()
    name_lower = destination_name.lower().strip()

    # Exact match first
    for dest in data:
        if dest.get("name", "").lower() == name_lower:
            return dest

    # Partial match
    for dest in data:
        if name_lower in dest.get("name", "").lower():
            return dest

    return None

def calc_sustainability(hotel: HotelCandidate, activities: List[ActivityCandidate]) -> float:
    """
    Calculate sustainability score (0-1) based on destination footprint.
    Higher score = more sustainable (low footfall, eco-friendly activities)
    """
    # Start with base score
    score = 0.5

    # Hotel category factor
    if hotel.category == "hostel":
        score += 0.2
    elif hotel.category == "guesthouse":
        score += 0.1
    # Hotels and resorts are neutral (0.0)

    # Activity category factor
    nature_heritage_activities = 0
    total_activities = len(activities)
    for act in activities:
        if act.category in ["heritage", "nature", "adventure"]:
            nature_heritage_activities += 1

    if total_activities > 0:
        # Bonus for nature/heritage/adventure activities
        activity_score = (nature_heritage_activities / total_activities) * 0.2
        score += activity_score

    return min(1.0, max(0.0, score))  # Clamp to 0-1

def calc_crowd_score(destination_name: str, travel_month: int) -> float:
    """
    Calculate crowd score (0-1) based on how peak the travel month is.
    Lower score = less crowded (off-peak is better for sustainability)
    """
    if not destination_name or travel_month is None:
        return 0.5  # Default middle score

    dest_info = _get_destination_by_name(destination_name)
    if not dest_info:
        return 0.5

    peak_months = dest_info.get("peak_months", [])
    if not peak_months:
        return 0.5

    # If travel month is in peak months, high crowd score (bad for sustainability)
    if travel_month in peak_months:
        return 0.8  # High crowd = less desirable for sustainability

    # Check if it's in season months at least
    season_months = dest_info.get("season_months", [])
    if travel_month in season_months:
        return 0.4  # In season but not peak = good

    # Off-season
    return 0.2  # Off-season = least crowded (best for sustainability)

def get_activity_combinations(activities: List[ActivityCandidate]) -> List[List[ActivityCandidate]]:
    """
    Generate activity combinations: none, singles, pairs, and triples.
    Limited to avoid combinatorial explosion.
    """
    combos = [[]]  # No activities

    # Single activities
    for act in activities:
        combos.append([act])

    # Pairs
    if len(activities) >= 2:
        for i in range(len(activities)):
            for j in range(i + 1, min(i + 3, len(activities))):  # Limit pairs to avoid too many
                combos.append([activities[i], activities[j]])

    # Triples (only if we have enough activities)
    if len(activities) >= 3:
        # Just take first few combinations to limit explosion
        for i in range(min(3, len(activities) - 2)):
            for j in range(i + 1, min(i + 3, len(activities) - 1)):
                for k in range(j + 1, min(j + 3, len(activities))):
                    combos.append([activities[i], activities[j], activities[k]])
                    break  # Limit to just a few triples
            if len(combos) > 20:  # Hard limit
                break
        if len(combos) > 20:
            break

    return combos

def optimize(travel_candidates: List[FlightCandidate | TrainCandidate],
             hotel_candidates: List[HotelCandidate],
             activity_candidates: List[ActivityCandidate],
             estimated_expenses: CostEstimate,
             total_budget: int,
             destination_name: str = "",
             travel_month: int = 0) -> List[PlanLabel]:

    feasible_plans = []

    # Limit candidates to avoid explosion
    max_travel = min(3, len(travel_candidates))
    max_hotel = min(3, len(hotel_candidates))

    for travel in travel_candidates[:max_travel]:
        for hotel in hotel_candidates[:max_hotel]:
            for activities in get_activity_combinations(activity_candidates):
                total = (travel.price_inr + hotel.price_total_inr +
                         sum(a.price_inr for a in activities) +
                         estimated_expenses.total_inr)

                if total <= total_budget:
                    # Calculate sustainability and crowd scores
                    sustainability = calc_sustainability(hotel, activities)
                    crowd_score = calc_crowd_score(destination_name, travel_month)

                    plan = Plan(
                        travel=travel,
                        hotel=hotel,
                        activities=activities,
                        estimated_total_inr=total,
                        headroom_inr=total_budget - total,
                        sustainability_score=sustainability,
                        crowd_score=crowd_score
                    )
                    feasible_plans.append(plan)

    return rank_and_label(feasible_plans)

def deduplicate(labeled_plans: List[tuple[str, Plan]]) -> List[PlanLabel]:
    seen_combos = set()
    result = []
    for label, plan in labeled_plans:
        combo_key = f"{plan.travel.id}_{plan.hotel.id}_{','.join(sorted([a.id for a in plan.activities]))}"
        if combo_key not in seen_combos:
            seen_combos.add(combo_key)
            result.append(PlanLabel(label=label, plan=plan))
    return result

def rank_and_label(plans: List[Plan]) -> List[PlanLabel]:
    if not plans:
        return []

    # Apply weighting for final score
    def calculate_plan_score(plan: Plan) -> float:
        # Normalize and weight different factors
        # Lower price is better
        price_score = 1.0 - min(1.0, plan.estimated_total_inr / 100000.0)  # Assume 100k as max

        # Higher sustainability is better
        sustainability_score = plan.sustainability_score

        # Lower crowd score is better (less crowded)
        crowd_score = 1.0 - plan.crowd_score

        # More activities is better (up to a point)
        activity_score = min(1.0, len(plan.activities) / 3.0)

        # Weighted combination
        return (price_score * 0.4) + (sustainability_score * 0.3) + (crowd_score * 0.2) + (activity_score * 0.1)

    # Sort by our custom score
    sorted_plans = sorted(plans, key=calculate_plan_score, reverse=True)

    labeled = []

    # Best Value: lowest cost among top-scoring plans
    # Take top 3 by score and pick cheapest
    top_by_score = sorted_plans[:min(3, len(sorted_plans))]
    best_value = min(top_by_score, key=lambda p: p.estimated_total_inr)
    labeled.append(("BEST_VALUE", best_value))

    # Best Experience: highest hotel rating + most activities
    best_exp = max(sorted_plans, key=lambda p: ((p.hotel.rating or 0) * 0.7) + (len(p.activities) * 0.3))
    labeled.append(("BEST_EXPERIENCE", best_exp))

    # Sustainable Choice: best sustainability score
    sustainable = max(sorted_plans, key=lambda p: p.sustainability_score)
    labeled.append(("SUSTAINABLE_CHOICE", sustainable))

    # Offbeat Pick: at least one offbeat activity or destination with low footfall
    def is_offbeat_plan(plan: Plan) -> bool:
        # Check if any activity is offbeat (we'd need activity tags for this)
        # For now, check if hotel is in a low footfall destination
        # This is approximate since we don't have direct activity offbeat info
        return True  # Simplified

    offbeat_plans = [p for p in sorted_plans if is_offbeat_plan(p)]
    if offbeat_plans:
        offbeat_pick = max(offbeat_plans, key=lambda p: p.sustainability_score)  # Prefer sustainable offbeat
        labeled.append(("OFFBEAT_PICK", offbeat_pick))

    # Better Travel: shortest travel time
    better_travel = min(sorted_plans, key=lambda p: p.travel.duration_minutes)
    labeled.append(("BETTER_TRAVEL", better_travel))

    # Deduplicate and limit to 5
    return deduplicate(labeled)[:5]