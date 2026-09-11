import json
import os
import google.generativeai as genai
from typing import List, Dict

PROMPT_TEMPLATE = """
Generate a SHORT (1 sentence) plain-language explanation for why this destination 
was recommended to this user. Write in the user's language.

User interests: {interests}
User budget tier: {spending_style}
Travel month: {month_name}

Destination: {destination_name}
Why it scored well: interests matched={interest_match_score}, season fit={season_fit_score}, 
budget fit={budget_fit_score}, novelty bonus={novelty_bonus}

Examples of good explanations:
- "Because you mentioned trekking and October is peak season for Arunachal Pradesh"
- "Budget-friendly hill station that's offbeat — matches your preference for hidden gems"
- "Goa mein October mein monsoon khatam hota hai — beach ke liye perfect time"

Write ONLY the explanation sentence. No JSON. No preamble.
"""

def load_destinations() -> List[Dict]:
    path = os.path.join(os.path.dirname(__file__), "..", "data", "destinations.json")
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception:
        return []

async def get_explanation(dest: Dict, user_interests: List[str], spending_style: str, month: int, scores: Dict) -> str:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key":
        return f"This matches your preferences and is great to visit in month {month}."
        
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.0-flash")
    
    prompt = PROMPT_TEMPLATE.format(
        interests=", ".join(user_interests) if user_interests else "general travel",
        spending_style=spending_style,
        month_name=f"Month {month}",
        destination_name=dest["name"],
        interest_match_score=scores["interest"],
        season_fit_score=scores["season"],
        budget_fit_score=scores["budget"],
        novelty_bonus=scores["novelty"]
    )
    
    response = model.generate_content(prompt)
    return response.text.strip()

async def recommend_destinations(user_interests: List[str], current_month: int, spending_style: str) -> List[Dict]:
    destinations = load_destinations()
    scored_dests = []
    
    for dest in destinations:
        # 1. Interest match (0.4)
        overlap = len(set(dest["tags"]).intersection(set(user_interests)))
        interest_score = min(1.0, overlap / max(1, len(user_interests))) if user_interests else 0.5
        
        # 2. Season fit (0.3)
        season_score = 1.0 if current_month in dest.get("season_months", []) else 0.0
        
        # 3. Budget fit (0.2)
        budget_score = 1.0 if dest.get("typical_cost_tier") == spending_style else 0.5
        
        # 4. Novelty bonus (0.1)
        novelty_score = 1.0 if dest.get("footfall") == "low" else (0.5 if dest.get("footfall") == "medium" else 0.0)
        
        total_score = (0.4 * interest_score) + (0.3 * season_score) + (0.2 * budget_score) + (0.1 * novelty_score)
        
        scored_dests.append({
            "destination": dest,
            "score": total_score,
            "component_scores": {
                "interest": round(interest_score, 2),
                "season": round(season_score, 2),
                "budget": round(budget_score, 2),
                "novelty": round(novelty_score, 2)
            }
        })
        
    # Sort by score
    scored_dests.sort(key=lambda x: x["score"], reverse=True)
    top_3 = scored_dests[:3]
    
    # Generate explanations
    results = []
    for item in top_3:
        explanation = await get_explanation(
            item["destination"], 
            user_interests, 
            spending_style, 
            current_month, 
            item["component_scores"]
        )
        results.append({
            "destination": item["destination"]["name"],
            "state": item["destination"]["state"],
            "score": item["score"],
            "explanation": explanation
        })
        
    return results