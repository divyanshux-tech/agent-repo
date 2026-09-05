from typing import Dict, Any, List

def generate_explanation(destination: Dict[str, Any], user_context: Dict[str, Any], score_breakdown: Dict[str, float], is_hidden_alt: bool = False) -> str:
    parts = []
    
    # 1. Interests Match
    user_interests = set(i.lower() for i in user_context.get("interests", []))
    dest_tags = set(t.lower() for t in destination.get("tags", []))
    overlap = list(user_interests.intersection(dest_tags))
    
    if overlap:
        # Take max 2
        matched_str = " and ".join(overlap[:2])
        parts.append(f"Because you mentioned {matched_str}")
        
    # 2. Season Match
    travel_month = user_context.get("travel_month")
    season_months = destination.get("season_months", [])
    peak_months = destination.get("peak_months", [])
    
    if travel_month:
        if travel_month in peak_months:
            parts.append(f"this is peak season for {destination['name']}")
        elif travel_month in season_months:
            parts.append(f"the weather is pleasant here with fewer crowds")
            
    # 3. Budget Match
    budget = user_context.get("total_budget_inr")
    if budget:
        b_fit = score_breakdown.get("budget_fit", 0.0)
        if b_fit >= 0.8:
            parts.append(f"it fits your ₹{budget} budget well")
        elif b_fit <= 0.2:
            parts.append(f"it may stretch your ₹{budget} budget")
            
    # 4. Festival Callout
    if travel_month and "festival" in dest_tags and travel_month in season_months:
        # Simplified festival logic: if it's tagged festival and we're in season, just say there are festivals
        parts.append("you might catch local festivals during your visit")
        
    # Combine parts
    if not parts:
        explanation = f"A great match for your trip to {destination['state']}."
    else:
        # Join with commas and an 'and' for the last one
        if len(parts) == 1:
            explanation = parts[0].capitalize() + "."
        else:
            explanation = ", ".join(parts[:-1]).capitalize() + ", and " + parts[-1] + "."
            
    # 5. Novelty / Footfall
    if is_hidden_alt:
        explanation = f"Hidden alternative: {explanation} A lesser-known alternative to mainstream places."
    elif destination.get("footfall", "").lower() == "low":
        explanation += " Plus, it's a calm, offbeat gem away from the crowds."
        
    return explanation
