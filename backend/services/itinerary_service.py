import os
import json
import google.generativeai as genai
from typing import Dict, Any

ITINERARY_PROMPT = """
Generate a detailed day-by-day travel itinerary based on the confirmed trip plan.
Return ONLY valid JSON. No preamble. No markdown.

Trip details:
- Destination: {destination}
- Days: {days}
- Travellers: {travellers}
- Travel date: {travel_date}
- Budget remaining after bookings: ₹{remaining_budget_inr}
- Spending style: {spending_style}

Confirmed bookings:
- Travel: {travel_summary}
- Hotel: {hotel_summary}
- Activities: {activities_list}

Local knowledge context (use this for accurate details):
{rag_context}

Generate {days} day objects. Each day must have 4-6 time slots.

Slot types: travel | checkin | checkout | explore | food | activity | rest

Return this exact JSON structure:
[
  {
    "day": 1,
    "date": "YYYY-MM-DD",
    "title": "Short evocative day title",
    "slots": [
      {
        "time": "HH:MM",
        "type": "slot_type",
        "title": "Short activity title",
        "description": "2-3 sentence description with practical details",
        "estimated_cost_inr": 500,
        "tips": "Optional local tip or warning"
      }
    ],
    "estimated_spend_today_inr": 2000
  }
]

Rules:
- Day 1 always starts with the confirmed arrival
- Last day always ends with departure logistics
- Include realistic local transport between places (auto, cab, etc.) with cost estimates
- Food slots should mention specific type of meal and price range
- Never suggest a closed attraction (use the local knowledge context for timings)
- Keep language consistent with {language} (Hindi/English/Hinglish)
- Total of all estimated_spend_today_inr should be close to remaining_budget_inr
"""

CHECKLIST_PROMPT = """
Generate a smart packing checklist for this trip. Return ONLY valid JSON.

Trip: {destination}, {days} days, departing {travel_date}
Type of trip: {trip_type}
Season/weather: {weather_summary}
Activities planned: {activities_list}

Return this structure:
{
  "checklist": [
    {
      "category": "Documents",
      "items": [
        {"item": "Aadhaar card or passport", "essential": true},
        {"item": "Booking confirmations printout", "essential": true}
      ]
    },
    {
      "category": "Clothing",
      "items": []
    },
    {
      "category": "Medications",
      "items": []
    },
    {
      "category": "Electronics",
      "items": []
    },
    {
      "category": "Destination-specific",
      "items": []
    }
  ]
}

Rules:
- Destination-specific category must reference the actual destination
- If trekking: add trekking poles, gaiters, thermal layers
- If beach: add reef-safe sunscreen, quick-dry towel, waterproof bag
- If heritage sites: add modest clothing note, comfortable walking shoes
- If mountain: emphasise warm layers even in summer months
- Keep it practical. No luxury items unless premium spending style.
- Max 8 items per category.
"""

async def generate_itinerary(params: Dict[str, Any]) -> str:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key":
        return json.dumps([{"day": 1, "title": "Mock Day", "slots": []}])

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        "gemini-2.0-flash", 
        generation_config={"response_mime_type": "application/json"}
    )
    
    prompt = ITINERARY_PROMPT.format(**params)
    response = model.generate_content(prompt)
    return response.text

async def generate_checklist(params: Dict[str, Any]) -> str:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key":
        return json.dumps({"checklist": []})

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        "gemini-2.0-flash", 
        generation_config={"response_mime_type": "application/json"}
    )
    
    prompt = CHECKLIST_PROMPT.format(**params)
    response = model.generate_content(prompt)
    return response.text