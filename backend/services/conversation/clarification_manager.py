import random
from typing import Any


class ClarificationManager:
    # origin is NOT required - we default to Delhi if not provided
    REQUIRED_FIELDS = ["destination", "travel_dates", "travellers", "duration_days", "budget"]

    def missing_fields(self, state: dict[str, Any], action: str) -> list[str]:
        # These actions don't need full trip info
        if action in {
            "RECOMMEND_DESTINATIONS",
            "CHANGE_HOTEL",
            "CHANGE_TRAVEL",
            "CHANGE_ACTIVITY",
            "UPDATE_BUDGET",
            "REPLAN_ALL",
            "CONFIRM_BOOKING",
            "ASK_KNOWLEDGE",
            "GET_WEATHER",
            "EXPLAIN_PLAN",
            "GET_ITINERARY",
            "GET_PACKING_LIST",
            "GET_DOCUMENT",
            "GET_FLIGHT_STATUS",
        }:
            return []

        missing = []
        # Destination first - most important
        if not self._location_value(state.get("destination")) and not state.get("destination_preference"):
            missing.append("destination")
        # Travel date second
        if not self._date_present(state.get("travel_dates")):
            missing.append("travel_dates")
        # Travellers third
        if not self._scalar_value(state.get("travellers")):
            missing.append("travellers")
        # Days fourth
        if not self._scalar_value(state.get("duration_days")):
            missing.append("duration_days")
        # Budget last
        if not self._budget_amount(state.get("budget")):
            missing.append("budget")
        return missing

    def next_question(self, missing: list[str], language: str = "en") -> str | None:
        if not missing:
            return None

        field = missing[0]
        is_hindi = language in {"hi", "hinglish", "hi-en", "unknown"}

        # Multiple natural variants per field to avoid robotic repetition
        questions_hi = {
            "destination": [
                "Aur kahan jaana hai plan mein? Koi specific jagah — Goa, Manali, Rajasthan — ya ek vibe batao jaise 'beach wali jagah' ya 'pahad'? 🏖️",
                "Destination decide hai? Batao kahan ki planning hai — mountains, beaches, heritage, ya kuch offbeat? 😊",
                "Theek hai! Ab batao kahan jaana chahte ho — koi city ya ek vibe like 'peaceful hills' ya 'historical places'?",
            ],
            "travel_dates": [
                "Kab jaana hai roughly? Exact date nahi toh month bhi theek hai — October, November, 'next month'?",
                "Aur travel dates? December mein jaoge ya koi aur time plan hai?",
                "Travel ka time decide hai? Kabhi bhi chalega — 'November end mein' bhi chal jaega! 😄",
            ],
            "travellers": [
                "Kitne log honge saath? Sirf aap, couple, family, ya dost gang? 👥",
                "Trip mein kitne log chalenge? Ek hint doge toh hotel aur seats accordingly plan karti hoon!",
                "Aur kitne logon ke liye plan banana hai — solo trip hai ya group mein?",
            ],
            "duration_days": [
                "Trip kitne din ka socha hai? 3 din, 5 din, ya ek haftaa?",
                "Kitne din ki chhutti hai? Weekend trip ya thoda lamba?",
                "Days decide hain? 4-5 din ka typical trip hota hai, ya aapka kuch aur plan hai?",
            ],
            "budget": [
                "Aur total budget roughly kitna hai? 20k, 30k, ya 50k — per person ya total, dono theek hai! 💰",
                "Ek budget range batao — bahut accurate nahi chahiye, 'around 30 hazar' bhi chal jaega!",
                "Budget ki baat karo — total trip mein kitna kharch karna sahi lagega aapko?",
            ],
        }

        questions_en = {
            "destination": [
                "Where are you thinking of going? Any city in mind — Goa, Manali, Jaipur — or just a vibe like 'beaches' or 'mountains'? 🏖️",
                "What's the destination? Tell me a place or just a feel — 'peaceful hills', 'heritage city', 'beach escape'?",
                "Got it! Where would you like to travel to? Even a broad region like 'Himachal' or 'Rajasthan' works!",
            ],
            "travel_dates": [
                "When are you planning to go? Even a rough month works — October, November, 'next month'? 📅",
                "What's the travel date? Doesn't need to be exact — 'late November' is totally fine!",
                "When is the trip? Give me a rough timeframe and I'll check availability!",
            ],
            "travellers": [
                "How many people are travelling — just you, a couple, family, or a group of friends? 👥",
                "How many folks are coming along? This helps me find the right rooms and seats!",
                "Solo trip or with company? And how many people in total?",
            ],
            "duration_days": [
                "How many days are you thinking? A weekend getaway or a longer trip?",
                "How long is the trip — 3 days, 5 days, a full week? 🗓️",
                "What's the trip duration? Even a rough number helps — '4-5 days' is perfect!",
            ],
            "budget": [
                "What's your total budget roughly? Even a range like '₹30k-50k' works — per person or total, either is fine! 💰",
                "One last thing — what budget are you working with for the whole trip?",
                "Budget range? Don't worry about being exact — 'around 40k total' or 'under 25k per person' is perfect!",
            ],
        }

        bank = questions_hi if is_hindi else questions_en
        variants = bank.get(field, [])
        if not variants:
            return None
        return random.choice(variants)

    def _location_value(self, value: Any) -> bool:
        if isinstance(value, dict):
            return bool(value.get("canonical_value") or value.get("canonical") or value.get("raw_value") or value.get("raw"))
        return bool(value)

    def _date_present(self, value: Any) -> bool:
        if isinstance(value, dict):
            return bool(value.get("start") or value.get("month") or value.get("exact_date") or value.get("raw_value"))
        return bool(value)

    def _scalar_value(self, value: Any) -> bool:
        if isinstance(value, dict):
            return value.get("value") is not None
        return value is not None

    def _budget_amount(self, value: Any) -> bool:
        if isinstance(value, dict):
            return value.get("amount") is not None
        return bool(value)
