"""
Stateless Itinerary Generator Service
Generates a full day-by-day, hour-by-hour itinerary for any Indian destination
using Gemini's reasoning + our curated destination knowledge base.
No trip_id required — works from raw trip params alone.
"""
import json
import logging
import os
import re
from typing import Any, Optional

import google.generativeai as genai

from services.destination_card_service import DESTINATION_CARDS, DESTINATION_ALIASES

logger = logging.getLogger(__name__)


ITINERARY_SYSTEM_PROMPT = """
You are India's best travel planner — an expert who knows every destination, hidden gem,
best guesthouses, local transport hacks, seasonal tips, and budget-optimised routing.

Generate a COMPLETE day-by-day, hour-by-hour itinerary for the given trip.
Return ONLY valid JSON in exactly the structure shown below. No extra text.

Rules:
- Every slot must have a realistic time (HH:MM format, 24h)
- Budget must be distributed realistically across days (food + stay + activity + transport)
- For hill stations/offbeat: include how to reach, where to stay, hidden gems
- Include at least 1 hidden gem per day that most tourists miss
- For Kasol/Himachal: include guesthouse names, trek info, café recommendations
- For Delhi → Kasol route: include bus from Kashmiri Gate ISBT details
- Activity costs must be accurate INR estimates
- Guest houses for budget trips: ₹400-1200/night for offbeat, ₹800-2000 for mainstream
- slot type must be one of: travel, train, checkin, checkout, explore, activity, food

JSON structure (return exactly this shape):
{
  "destination": "Kasol",
  "total_days": 3,
  "total_budget_inr": 10000,
  "estimated_total_spend_inr": 9200,
  "origin": "Delhi",
  "best_season": "October to June",
  "how_to_reach": "Delhi Kashmiri Gate ISBT → Bhuntar/Kasol HRTC Volvo ₹600-800 overnight",
  "stay_recommendation": "Mountain View Guest House or Parvati Guest House ₹600-900/night",
  "tips": ["Carry cash — Kasol has limited ATMs", "Book Kheerganga trek permits online"],
  "days": [
    {
      "day": 1,
      "title": "Delhi to Kasol | Overnight Journey",
      "date_label": "Day 1",
      "estimated_spend_inr": 1800,
      "slots": [
        {
          "time": "22:00",
          "type": "travel",
          "activity": "Board HRTC Volvo Bus from Kashmiri Gate ISBT",
          "description": "Overnight Volvo to Bhuntar. Book at himachal.nic.in or counter. ~12 hours.",
          "estimated_cost_inr": 750,
          "tips": "Carry snacks, jacket. Bus from Gate 7."
        }
      ]
    }
  ]
}
"""


async def generate_itinerary(
    destination: str,
    days: int,
    budget_inr: int,
    origin: str = "Delhi",
    travellers: int = 1,
    month: Optional[int] = None,
    interests: Optional[list] = None,
    language: str = "en",
) -> dict[str, Any]:
    """
    Generate a complete trip itinerary using Gemini 2.0 Flash.
    Falls back to curated template if Gemini is unavailable.
    """
    # Enrich with our local knowledge base context
    dest_lower = destination.lower().strip()
    dest_key = DESTINATION_ALIASES.get(dest_lower, dest_lower)
    known_cards = DESTINATION_CARDS.get(dest_key, [])
    known_places = [c["name"] for c in known_cards[:8]]

    interests_str = ", ".join(interests or ["sightseeing", "local food", "nature"])
    month_name = _month_name(month) if month else "any season"
    places_hint = f"Known highlights to include: {', '.join(known_places)}" if known_places else ""

    lang_instruction = "Reply tips and descriptions in Hindi/Hinglish" if language in ["hi", "hinglish"] else "Reply in English"

    user_message = f"""
Plan a {days}-day trip to {destination} from {origin}.
Budget: ₹{budget_inr:,} total for {travellers} person(s).
Travel month: {month_name}
Interests: {interests_str}
{places_hint}

Include:
- Transport from {origin} (bus/train options, boarding points, costs)
- Hour-by-hour daily schedule (morning → afternoon → evening for each day)
- Budget accommodation names and costs
- Local food: actual café/dhaba names
- Hidden gems + activities with costs
- Day-by-day spend breakdown summing to ~₹{budget_inr:,}
- Practical tips

{lang_instruction}.
Return ONLY the JSON structure, nothing else.
"""

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")
    if not api_key:
        logger.warning("No Gemini API key — returning fallback itinerary")
        return _fallback_itinerary(destination, days, budget_inr, origin, travellers, known_cards)

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-3.6-flash",
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                response_mime_type="application/json",
            ),
            system_instruction=ITINERARY_SYSTEM_PROMPT,
        )
        response = await model.generate_content_async(user_message)
        raw = response.text.strip()

        # Strip any markdown code fences
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)

        data = json.loads(raw)

        # Validate minimum structure
        if "days" not in data or not isinstance(data.get("days"), list):
            raise ValueError("No days array in Gemini response")

        # Inject defaults for missing fields
        data.setdefault("total_budget_inr", budget_inr)
        data.setdefault("destination", destination)
        data.setdefault("origin", origin)
        data.setdefault("total_days", days)

        # Ensure each day card is valid
        for i, day in enumerate(data["days"]):
            day.setdefault("day", i + 1)
            day.setdefault("title", f"Day {i + 1}")
            day.setdefault("estimated_spend_inr", budget_inr // max(days, 1))
            for slot in day.get("slots", []):
                slot.setdefault("estimated_cost_inr", 0)
                slot.setdefault("type", "explore")
                slot.setdefault("tips", "")

        logger.info(f"✅ Itinerary generated for {destination} ({days}d / ₹{budget_inr:,})")
        return data

    except Exception as exc:
        logger.error(f"Itinerary Gemini call failed: {exc}")
        return _fallback_itinerary(destination, days, budget_inr, origin, travellers, known_cards)


# ── Curated fallback itinerary ───────────────────────────────────────────────

def _fallback_itinerary(
    destination: str,
    days: int,
    budget_inr: int,
    origin: str,
    travellers: int,
    known_cards: list,
) -> dict[str, Any]:
    daily_budget = budget_inr // max(days, 1)
    stay_budget  = min(daily_budget // 3, 1200)
    food_budget  = min(daily_budget // 4, 600)
    activity_budget = max(daily_budget - stay_budget - food_budget, 200)

    places = [(c["name"], c["description"]) for c in known_cards]
    total_places = len(places)

    fallback_days = []
    for d in range(1, days + 1):
        slots = []

        if d == 1:
            slots.append({
                "time": "06:00", "type": "travel",
                "activity": f"Depart {origin} — Bus/Train to {destination}",
                "description": f"Take the morning bus or train from {origin}. Book via redBus or IRCTC for best fares.",
                "estimated_cost_inr": min(budget_inr // 5, 1500),
                "tips": "Travel overnight to save on accommodation costs.",
            })
            slots.append({
                "time": "14:00", "type": "checkin",
                "activity": f"Arrive & Check-in to guesthouse in {destination}",
                "description": f"Freshen up after the journey. Budget guesthouses cost ₹{stay_budget}–{stay_budget + 400}/night.",
                "estimated_cost_inr": stay_budget,
                "tips": "Ask locals for guesthouse recommendations on arrival.",
            })
            slots.append({
                "time": "16:30", "type": "explore",
                "activity": f"Explore {destination} town / main bazaar",
                "description": f"Take a relaxed evening walk to soak in the vibe of {destination}.",
                "estimated_cost_inr": 0,
            })
            slots.append({
                "time": "19:30", "type": "food",
                "activity": "Dinner at local dhaba / café",
                "description": f"Try local food — budget ₹150–250 per person.",
                "estimated_cost_inr": food_budget // 2,
            })

        elif d == days:
            slots.append({
                "time": "08:00", "type": "food",
                "activity": "Breakfast + checkout",
                "description": "Pack up and checkout. Grab a quick breakfast.",
                "estimated_cost_inr": 150,
            })
            # One last activity
            if total_places > 0:
                idx = ((d - 1) * 2) % total_places
                pname, pdesc = places[idx]
                slots.append({
                    "time": "09:30", "type": "explore",
                    "activity": f"Last visit: {pname}",
                    "description": pdesc,
                    "estimated_cost_inr": activity_budget // 4,
                })
            slots.append({
                "time": "13:00", "type": "travel",
                "activity": f"Depart {destination} → {origin}",
                "description": f"Board return bus/train to {origin}. Carry souvenirs!",
                "estimated_cost_inr": min(budget_inr // 5, 1500),
            })

        else:
            slots.append({
                "time": "07:30", "type": "food",
                "activity": "Breakfast at a local dhaba",
                "description": "Aloo paratha, chai, and omelette — the perfect mountain morning.",
                "estimated_cost_inr": 150,
            })
            # Morning activity
            start_idx = ((d - 1) * 2) % max(total_places, 1)
            for pi in range(2):
                idx = (start_idx + pi) % max(total_places, 1)
                pname = places[idx][0] if total_places > 0 else f"Landmark in {destination}"
                pdesc = places[idx][1] if total_places > 0 else f"Explore the highlights of {destination}."
                visit_time = f"{9 + pi * 3:02d}:30"
                slots.append({
                    "time": visit_time, "type": "explore",
                    "activity": f"Visit {pname}",
                    "description": pdesc,
                    "estimated_cost_inr": activity_budget // 3,
                })
            slots.append({
                "time": "13:00", "type": "food",
                "activity": "Lunch — local cuisine",
                "description": f"Try the local specialties. Budget ₹150–200 per person.",
                "estimated_cost_inr": food_budget // 2,
            })
            slots.append({
                "time": "19:30", "type": "food",
                "activity": "Dinner",
                "description": "Enjoy dinner at a popular local eatery.",
                "estimated_cost_inr": food_budget // 2,
            })

        fallback_days.append({
            "day": d,
            "title": f"Day {d} — {destination}",
            "date_label": f"Day {d}",
            "estimated_spend_inr": daily_budget,
            "slots": slots,
        })

    return {
        "destination": destination,
        "origin": origin,
        "total_days": days,
        "total_budget_inr": budget_inr,
        "estimated_total_spend_inr": budget_inr,
        "best_season": "October to March",
        "how_to_reach": f"Check redBus or IRCTC for buses and trains from {origin} to {destination}.",
        "stay_recommendation": f"Budget guesthouses in {destination}: ₹{stay_budget}–{stay_budget + 600}/night.",
        "tips": [
            f"Book accommodation in {destination} in advance during peak season.",
            "Carry cash as ATMs may be limited in smaller hill towns.",
            "Local guides cost ₹500–800/day and make a huge difference.",
        ],
        "days": fallback_days,
    }


def _month_name(month: int) -> str:
    names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
             "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return names[month - 1] if 1 <= month <= 12 else "anytime"