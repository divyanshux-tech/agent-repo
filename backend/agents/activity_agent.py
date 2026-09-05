import json
import os
from typing import List
from models.candidate import ActivityCandidate

def load_activities():
    path = os.path.join(os.path.dirname(__file__), "..", "data", "activities.json")
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception:
        return []

def search_activities(region: str, month: int, interests: List[str], remaining_budget_inr: int, travellers: int) -> List[ActivityCandidate]:
    all_activities = load_activities()
    candidates = []
    
    for act in all_activities:
        # Filter by region
        if act["region"].lower() != (region or "").lower():
            continue
            
        # Filter by season
        if month not in act.get("season_months", []):
            continue
            
        # Filter by budget
        total_cost = act["price_inr"] * travellers
        if total_cost > remaining_budget_inr:
            continue
            
        # Calculate interest match score
        score = 0.5
        if act["category"] in interests:
            score = 1.0
            
        candidates.append(ActivityCandidate(
            id=act["id"],
            name=act["name"],
            region=act["region"],
            category=act["category"],
            price_inr=act["price_inr"],
            duration_hrs=act["duration_hrs"],
            interest_match_score=score,
            operator_note=act.get("operator_note")
        ))
        
    # Sort by interest match score
    candidates.sort(key=lambda x: x.interest_match_score, reverse=True)
    return candidates[:6]