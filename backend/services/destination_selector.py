import math
from typing import List, Dict, Any
from .destination_scorer import score_destination
from .explanation_generator import generate_explanation

import asyncio

async def select_shortlist(user_context: Dict[str, Any], catalog: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    # Determine target size
    query = user_context.get("raw_user_query", "").lower()
    if "explore options" in query:
        target_size = 6
    elif "shortlist" in query:
        target_size = 3
    else:
        target_size = 4
        
    # Minimum required low footfall items
    required_long_tail = math.ceil(target_size * 0.2) # e.g. 20% of 4 = 0.8 -> 1. 20% of 6 = 1.2 -> 2.
    
    scored_candidates = []
    
    # 1. Score all candidates concurrently to handle async weather fetching
    async def score_wrapper(dest):
        score, breakdown = await score_destination(dest, user_context)
        return {
            "destination": dest,
            "score": score,
            "breakdown": breakdown
        }
        
    scored_candidates = await asyncio.gather(*(score_wrapper(d) for d in catalog))
        
    # 2. Sort by score DESC
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)
    
    # 3. Apply state de-duplication and build initial shortlist
    initial_shortlist = []
    state_counts = {}
    
    for cand in scored_candidates:
        state = cand["destination"]["state"]
        
        # State cap logic: cap at 2 per state if shortlist > 4 and >= 3 from same state
        # Actually rule says: "De-duplicate by state only if there are >=3 from same state AND shortlist exceeds 4 — cap at 2 per state"
        # To enforce "cap at 2 per state if shortlist > 4", we just keep a running tally.
        # It's simpler to always track, but only reject if target_size > 4 and we already have 2.
        if target_size > 4 and state_counts.get(state, 0) >= 2:
            continue
            
        initial_shortlist.append(cand)
        state_counts[state] = state_counts.get(state, 0) + 1
        
        if len(initial_shortlist) == target_size:
            break
            
    # 4. Enforce Long-Tail Novelty Floor
    low_footfall_count = sum(1 for c in initial_shortlist if c["destination"].get("footfall", "").lower() == "low")
    
    if low_footfall_count < required_long_tail:
        # We need to swap in low footfall items
        needed = required_long_tail - low_footfall_count
        
        # Find highest scoring low-footfall items NOT in initial_shortlist
        available_low = [c for c in scored_candidates if c["destination"].get("footfall", "").lower() == "low" and c not in initial_shortlist]
        
        # Find lowest scoring non-low-footfall items IN initial_shortlist that we can drop
        # We sort initial_shortlist ascending by score to drop the weakest links
        droppable = sorted([c for c in initial_shortlist if c["destination"].get("footfall", "").lower() != "low"], key=lambda x: x["score"])
        
        swaps = min(needed, len(available_low), len(droppable))
        
        for i in range(swaps):
            initial_shortlist.remove(droppable[i])
            initial_shortlist.append(available_low[i])
            
    # Resort final just to be clean
    initial_shortlist.sort(key=lambda x: x["score"], reverse=True)
    
    # Format output
    final_output = []
    for rank, cand in enumerate(initial_shortlist, 1):
        dest = cand["destination"]
        
        # Determine if we need to call it out as a hidden alternative
        user_avoids_offbeat = user_context.get("constraints", {}).get("no_offbeat") is True
        is_low_footfall = dest.get("footfall", "").lower() == "low"
        
        explanation = generate_explanation(dest, user_context, cand["breakdown"], is_hidden_alt=(user_avoids_offbeat and is_low_footfall))
        
        final_output.append({
            "rank": rank,
            "destination_id": dest["id"],
            "name": dest["name"],
            "state": dest["state"],
            "summary": dest.get("summary", ""),
            "score": cand["score"],
            "score_breakdown": cand["breakdown"],
            "explanation": explanation,
            "tags": dest.get("tags", []),
            "footfall": dest.get("footfall", "high"),
            "typical_cost_tier": dest.get("typical_cost_tier", "standard"),
            "nearest_airport": dest.get("nearest_airport"),
            "nearest_railway_station": dest.get("nearest_railway_station")
        })
        
    return final_output
