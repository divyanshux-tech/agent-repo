import json
import os
from typing import List, Optional
from datetime import datetime, timezone

from models.candidate import ActivityCandidate
from db.supabase_client import supabase

CATALOG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "activities.json")

# Difficulty mapping for comparison
DIFFICULTY_LEVELS = {
    "easy": 1,
    "moderate": 2,
    "challenging": 3,
    "expert": 4
}

def load_catalog():
    if not os.path.exists(CATALOG_PATH):
        return []
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

async def search_activities(
    destination: str,
    month: int,
    travellers: int,
    remaining_budget_inr: int,
    interests: List[str] = [],
    difficulty_max: Optional[str] = None,
    trip_id: Optional[str] = None
) -> List[ActivityCandidate]:
    catalog = load_catalog()
    
    # Setup difficulty thresholds
    max_level = 3  # Default excludes 'expert'
    if difficulty_max and difficulty_max.lower() in DIFFICULTY_LEVELS:
        max_level = DIFFICULTY_LEVELS[difficulty_max.lower()]

    valid_candidates = []
    
    for item in catalog:
        # 1. Season filter
        if month not in item.get("season_months", []):
            continue
            
        # 2. Region filter
        regions = item.get("regions", [])
        if destination.lower() not in [r.lower() for r in regions]:
            continue
            
        # 3. Budget filter
        total_price = item.get("price_band_inr", 0) * travellers
        if total_price > remaining_budget_inr:
            continue
            
        # 4. Difficulty filter
        item_diff_str = item.get("difficulty", "easy").lower()
        item_level = DIFFICULTY_LEVELS.get(item_diff_str, 1)
        if item_level > max_level:
            continue
            
        # Soft Scoring: Interest Match
        item_cats = set(item.get("categories", []))
        user_ints = set([i.lower() for i in interests])
        
        intersection = item_cats.intersection(user_ints)
        score = len(intersection) / len(item_cats) if len(item_cats) > 0 else 0.0
        
        valid_candidates.append({
            "data": item,
            "score": score
        })
        
    # Rank by score desc, then by price asc
    valid_candidates.sort(key=lambda x: (-x["score"], x["data"].get("price_band_inr", 0)))
    
    # Cap to top 10 to avoid overwhelming the user
    top_items = valid_candidates[:10]
    
    # Create ActivityCandidate models
    results = []
    for idx, item in enumerate(top_items):
        data = item["data"]
        candidate = ActivityCandidate(
            id=f"A{idx+1}",
            name=data["name"],
            region=destination,
            category=data["categories"][0] if data.get("categories") else "general",
            price_inr=data.get("price_band_inr", 0),
            duration_hrs=data.get("duration_hrs", 1.0),
            interest_match_score=item["score"],
            operator_note=data.get("operator_note"),
            source_reference=data["id"]
        )
        results.append(candidate)
        
    # Persist to Supabase if trip_id is present
    if trip_id and supabase:
        now_str = datetime.now(timezone.utc).isoformat()
        
        # Mark previous activity candidates as superseded
        supabase.table("trip_candidates").update({
            "superseded_at": now_str
        }).eq("trip_id", trip_id).eq("type", "ACTIVITY").is_("superseded_at", "null").execute()
        
        # Insert new candidates
        if results:
            rows = []
            for c in results:
                rows.append({
                    "id": c.id,
                    "trip_id": trip_id,
                    "type": "ACTIVITY",
                    "provider": "static_catalog",
                    "provider_reference": c.source_reference,
                    "data_json": c.model_dump(mode="json"),
                    "price_inr": c.price_inr * travellers,
                    "expires_at": None  # No strict expiry for static activities
                })
            supabase.table("trip_candidates").insert(rows).execute()
            
    return results

def get_featured_activities(month: int, count: int = 5) -> List[dict]:
    catalog = load_catalog()
    valid = [item for item in catalog if month in item.get("season_months", [])]
    # Simple sort to pick featured: perhaps by price (more premium) or random.
    # We will just take the first N valid for now as it acts as a rotation
    return valid[:count]
