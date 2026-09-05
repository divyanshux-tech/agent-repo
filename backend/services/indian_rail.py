import os
import time
import httpx
from datetime import datetime
from typing import List, Dict, Any, Tuple
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

class IndianRailAuthError(Exception): pass

# In-memory cache: { "from_to_date": (expiry_timestamp, [raw_rows]) }
_TRAIN_CACHE: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
    reraise=True
)
async def _make_api_call(client: httpx.AsyncClient, url: str, headers: Dict[str, str]) -> httpx.Response:
    res = await client.get(url, headers=headers)
    if res.status_code == 403:
        raise IndianRailAuthError(f"RapidAPI auth error: {res.text}")
    if res.status_code >= 500:
        res.raise_for_status()
    # If 4xx other than 403, we let it be handled outside or just return
    return res

async def search_trains(
    *,
    from_station_code: str,
    to_station_code: str,
    date: datetime
) -> List[Dict[str, Any]]:
    
    cache_key = f"{from_station_code}_{to_station_code}_{date.isoformat()}"
    now = time.time()
    
    if cache_key in _TRAIN_CACHE:
        expiry, cached_data = _TRAIN_CACHE[cache_key]
        if now < expiry:
            return cached_data

    base_url = os.environ.get("RAPIDAPI_INDIAN_RAIL_BASE_URL", "https://indianrailapi.com/api/v1")
    key = os.environ.get("RAPIDAPI_KEY", "")
    host = os.environ.get("RAPIDAPI_INDIAN_RAIL_HOST", "indianrailapi.com")
    
    headers = {
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": host
    }
    
    # Example rapidapi format based on instructions
    url = f"{base_url}/trainBetweenStations?from={from_station_code}&to={to_station_code}"
    
    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            res = await _make_api_call(client, url, headers)
            res.raise_for_status()
            data = res.json()
        except httpx.HTTPStatusError as e:
            # If 400/404, we just assume no route and return []
            if e.response.status_code < 500:
                return []
            raise
        except Exception:
            raise
            
        # Parse data, assuming RapidAPI returns a list in "data" or similar
        trains_list = data.get("data", [])
        
        raw_rows = []
        for train in trains_list:
            raw_rows.append({
                "train_number": train.get("train_number", "UNKNOWN"),
                "train_name": train.get("train_name", "Unknown Express"),
                "from_station_code": from_station_code,
                "to_station_code": to_station_code,
                "dep_time": train.get("departure_time", "08:00"),
                "arr_time": train.get("arrival_time", "18:00"),
                "duration_minutes": train.get("duration_minutes", 600),
                "classes": train.get("classes", [
                    {"class_code": "3A", "price_inr": 1500, "availability": "available"}
                ])
            })
            
        _TRAIN_CACHE[cache_key] = (now + 1800, raw_rows)
        return raw_rows
