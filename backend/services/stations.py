import json
import os
from functools import lru_cache
from typing import Optional, Dict, Any, List

STATIONS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "stations.json")

class Station:
    def __init__(self, data: Dict[str, Any]):
        self.code = data.get("code", "")
        self.name = data.get("name", "")
        self.city = data.get("city", "")
        self.iata = data.get("iata", "")
        self.lat = data.get("lat")
        self.lng = data.get("lng")

@lru_cache
def get_stations() -> List[Station]:
    try:
        with open(STATIONS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [Station(row) for row in data]
    except Exception:
        return []

def find_by_city(query: str) -> Optional[Station]:
    """Finds a station by city, IATA, or station code."""
    query = query.lower().strip()
    stations = get_stations()
    
    # 1. Exact match by station code or IATA
    for st in stations:
        if st.code.lower() == query or st.iata.lower() == query:
            return st
            
    # 2. Exact match by city
    for st in stations:
        if st.city.lower() == query:
            return st
            
    # 3. Partial match by city or name
    for st in stations:
        if query in st.city.lower() or query in st.name.lower():
            return st
            
    return None
