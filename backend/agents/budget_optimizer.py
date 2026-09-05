from typing import List
from models.candidate import FlightCandidate, TrainCandidate, HotelCandidate, ActivityCandidate
from models.plan import Plan, PlanLabel, CostEstimate

def get_activity_combinations(activities: List[ActivityCandidate]) -> List[List[ActivityCandidate]]:
    # Mock combinations: none, single activities, pairs
    combos = [[]]
    for act in activities:
        combos.append([act])
    if len(activities) >= 2:
        combos.append([activities[0], activities[1]])
    return combos

def calc_sustainability(hotel: HotelCandidate, activities: List[ActivityCandidate]) -> float:
    # Mock sustainability score
    score = 0.5
    if hotel.category == "guesthouse":
        score += 0.2
    for act in activities:
        if act.category in ["heritage", "nature"]:
            score += 0.1
    return min(1.0, score)

def calc_crowd_score(date_str: str, destination: str) -> float:
    return 0.8  # Mock

def optimize(travel_candidates: List[FlightCandidate | TrainCandidate], 
             hotel_candidates: List[HotelCandidate], 
             activity_candidates: List[ActivityCandidate],
             estimated_expenses: CostEstimate, 
             total_budget: int) -> List[PlanLabel]:
    
    feasible_plans = []
    
    for travel in travel_candidates[:5]:
        for hotel in hotel_candidates[:5]:
            for activities in get_activity_combinations(activity_candidates):
                total = (travel.price_inr + hotel.price_total_inr +
                         sum(a.price_inr for a in activities) +
                         estimated_expenses.total_inr)
                
                if total <= total_budget:
                    plan = Plan(
                        travel=travel,
                        hotel=hotel,
                        activities=activities,
                        estimated_total_inr=total,
                        headroom_inr=total_budget - total,
                        sustainability_score=calc_sustainability(hotel, activities),
                        crowd_score=0.8
                    )
                    feasible_plans.append(plan)
                    
    return rank_and_label(feasible_plans)

def deduplicate(labeled_plans: List[tuple[str, Plan]]) -> List[PlanLabel]:
    seen_combos = set()
    result = []
    for label, plan in labeled_plans:
        combo_key = f"{plan.travel.id}_{plan.hotel.id}_{','.join(a.id for a in plan.activities)}"
        if combo_key not in seen_combos:
            seen_combos.add(combo_key)
            result.append(PlanLabel(label=label, plan=plan))
    return result

def rank_and_label(plans: List[Plan]) -> List[PlanLabel]:
    if not plans:
        return []
        
    labeled = []
    
    # Best Value: cheapest feasible
    best_value = min(plans, key=lambda p: p.estimated_total_inr)
    labeled.append(("BEST_VALUE", best_value))
    
    # Best Experience: highest hotel rating + most activities
    best_exp = max(plans, key=lambda p: (p.hotel.rating or 0) + len(p.activities))
    labeled.append(("BEST_EXPERIENCE", best_exp))
    
    # Sustainable Choice: best sustainability score
    sustainable = max(plans, key=lambda p: p.sustainability_score)
    labeled.append(("SUSTAINABLE", sustainable))
    
    return deduplicate(labeled)[:5]