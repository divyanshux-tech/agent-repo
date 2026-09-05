import json
import os
from datetime import datetime

CHUNKS = [
    {
        "id": "goa-seasonality",
        "destination": "Goa",
        "type": "seasonality",
        "content": "Goa in October marks the end of the monsoon. The weather starts getting pleasant, beach shacks begin to open, and it is a great time for swimming and water sports before the peak winter crowds arrive. November to February is peak season. Summer (March-May) is extremely hot and humid.",
        "metadata": {"state": "Goa", "topics": ["season", "october", "weather"]},
        "last_updated": "2026-01-01"
    },
    {
        "id": "spiti-accessibility",
        "destination": "Spiti Valley",
        "type": "accessibility",
        "content": "Spiti Valley is generally accessible by road via Shimla year-round, but the Manali to Kaza route (via Rohtang and Kunzum Pass) is typically open only from June to mid-October. Heavy snowfall blocks the Manali route in winter. Always check current road statuses.",
        "metadata": {"state": "Himachal Pradesh", "topics": ["roads", "winter", "driving"]},
        "last_updated": "2026-01-01"
    },
    {
        "id": "hampi-entry-fees",
        "destination": "Hampi",
        "type": "entry-fees",
        "content": "Entry fee for the Vittala Temple complex and the Zenana Enclosure in Hampi is ₹40 for Indians and ₹600 for foreigners. Most other ruins and temples in Hampi do not have an entry fee. A battery-operated buggy is available at Vittala for ₹20.",
        "metadata": {"state": "Karnataka", "topics": ["fees", "tickets", "temples"]},
        "last_updated": "2026-01-01"
    },
    {
        "id": "leh-december",
        "destination": "Leh Ladakh",
        "type": "seasonality",
        "content": "Visiting Leh in December is extremely harsh. Temperatures drop well below freezing (often -15°C to -20°C). Roads via Manali and Srinagar are completely closed. The only way to reach Leh is by flight. Most hotels are closed, and central heating is a must. High altitude sickness is harder to manage in extreme cold.",
        "metadata": {"state": "Ladakh", "topics": ["winter", "december", "weather", "flights"]},
        "last_updated": "2026-01-01"
    },
    {
        "id": "kerala-houseboats",
        "destination": "Kerala",
        "type": "activities",
        "content": "Alleppey houseboats are best enjoyed from September to March. They usually include all meals (traditional Kerala cuisine) and a backwater cruise. Air conditioning is typically turned on only at night (9 PM to 6 AM) unless a premium day-A/C boat is booked.",
        "metadata": {"state": "Kerala", "topics": ["houseboats", "alleppey", "food"]},
        "last_updated": "2026-01-01"
    },
    {
        "id": "meghalaya-monsoon",
        "destination": "Meghalaya",
        "type": "seasonality",
        "content": "Meghalaya (Cherrapunji/Mawsynram) receives extreme rainfall during the monsoon (June-September). While waterfalls are in their full glory, caving and trekking to living root bridges can be slippery and dangerous. October and November are ideal for clear skies and lush greenery.",
        "metadata": {"state": "Meghalaya", "topics": ["monsoon", "rain", "waterfalls", "trekking"]},
        "last_updated": "2026-01-01"
    },
    {
        "id": "taj-mahal-timings",
        "destination": "Agra",
        "type": "timings",
        "content": "The Taj Mahal is open from sunrise to sunset every day EXCEPT Friday (when it is closed for prayers). Night viewing is allowed for 5 nights around the full moon (excluding Fridays and Ramzan).",
        "metadata": {"state": "Uttar Pradesh", "topics": ["timings", "taj mahal", "closed"]},
        "last_updated": "2026-01-01"
    },
    {
        "id": "andaman-ferry",
        "destination": "Andaman Islands",
        "type": "transport",
        "content": "To travel between Port Blair, Havelock (Swaraj Dweep), and Neil Island (Shaheed Dweep), you must book government or private ferries (Makruzz, Green Ocean, SeaLink). Advance booking is highly recommended as tickets sell out days in advance during peak season (Dec-Jan).",
        "metadata": {"state": "Andaman and Nicobar", "topics": ["ferry", "transport", "havelock"]},
        "last_updated": "2026-01-01"
    },
    {
        "id": "rishikesh-rafting",
        "destination": "Rishikesh",
        "type": "activities",
        "content": "River rafting in Rishikesh is closed during the monsoon season (July to mid-September) due to high water levels. The best time for rafting is mid-September to June. Book with certified operators in Shivpuri.",
        "metadata": {"state": "Uttarakhand", "topics": ["rafting", "adventure", "monsoon"]},
        "last_updated": "2026-01-01"
    },
    {
        "id": "darjeeling-toy-train",
        "destination": "Darjeeling",
        "type": "activities",
        "content": "The Darjeeling Himalayan Railway (Toy Train) Joy Ride runs from Darjeeling to Ghum and back. Book tickets well in advance via IRCTC. Steam engine rides are slightly more expensive but offer an authentic vintage experience compared to the diesel engines.",
        "metadata": {"state": "West Bengal", "topics": ["train", "joyride", "tickets"]},
        "last_updated": "2026-01-01"
    },
    {
        "id": "jaipur-forts",
        "destination": "Jaipur",
        "type": "timings",
        "content": "A composite ticket is available in Jaipur valid for 2 days. It includes entry to Amber Fort, Jantar Mantar, Hawa Mahal, Nahargarh Fort, and Albert Hall Museum. It saves time and money compared to buying individual tickets.",
        "metadata": {"state": "Rajasthan", "topics": ["forts", "tickets", "hawa mahal"]},
        "last_updated": "2026-01-01"
    },
    {
        "id": "varanasi-aarti",
        "destination": "Varanasi",
        "type": "timings",
        "content": "The famous Ganga Aarti at Dashashwamedh Ghat in Varanasi takes place every evening around 6:45 PM in summer and 6:00 PM in winter. Arrive at least an hour early to secure a good viewing spot, or hire a boat to watch from the river.",
        "metadata": {"state": "Uttar Pradesh", "topics": ["aarti", "ganga", "evening"]},
        "last_updated": "2026-01-01"
    },
    {
        "id": "munnar-weather",
        "destination": "Munnar",
        "type": "seasonality",
        "content": "Munnar is pleasant year-round. Summers (March-May) are mild (15-25°C), making it a great escape from the heat. Monsoons (June-August) are heavy but lush. Winters (Dec-Feb) can be quite chilly, dropping to 5°C, requiring light to medium woolens.",
        "metadata": {"state": "Kerala", "topics": ["weather", "summer", "winter"]},
        "last_updated": "2026-01-01"
    }
]

if __name__ == "__main__":
    os.makedirs(os.path.join(os.path.dirname(__file__), "..", "data"), exist_ok=True)
    out_path = os.path.join(os.path.dirname(__file__), "..", "data", "knowledge_chunks.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"chunks": CHUNKS}, f, indent=2)
    print(f"Seeded {len(CHUNKS)} knowledge chunks to {out_path}")
