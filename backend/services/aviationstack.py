import os
import time
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Tuple
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

class AviationstackAuthError(Exception): pass
class AviationstackBadRequestError(Exception): pass
class AviationstackRateLimitedError(Exception): pass

# In-memory cache: { "from_to_date": (expiry_timestamp, [raw_rows]) }
_FLIGHT_CACHE: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}

def _should_retry_httpx(exc: Exception) -> bool:
    if isinstance(exc, httpx.TransportError):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        if exc.response.status_code >= 500:
            return True
    return False

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
    reraise=True
)
async def _make_api_call(client: httpx.AsyncClient, url: str) -> httpx.Response:
    res = await client.get(url)
    if res.status_code == 429:
        # Rate limit handled outside
        return res
    if 400 <= res.status_code < 500:
        if res.status_code in (401, 403):
            raise AviationstackAuthError(f"Auth error: {res.text}")
        else:
            raise AviationstackBadRequestError(f"Bad request: {res.text}")
    res.raise_for_status()
    return res

async def search_flights(
    *,
    from_iata: str,
    to_iata: str,
    date: datetime,
    max_results: int = 10
) -> List[Dict[str, Any]]:
    
    cache_key = f"{from_iata}_{to_iata}_{date.isoformat()}"
    now = time.time()
    
    # Check cache
    if cache_key in _FLIGHT_CACHE:
        expiry, cached_data = _FLIGHT_CACHE[cache_key]
        if now < expiry:
            return cached_data
            
    base_url = os.environ.get("AVIATIONSTACK_BASE_URL", "https://api.aviationstack.com/v1")
    key = os.environ.get("AVIATIONSTACK_ACCESS_KEY", "")
    
    date_str = date.strftime("%Y-%m-%d")
    url = f"{base_url}/flights?access_key={key}&dep_iata={from_iata}&arr_iata={to_iata}&flight_date={date_str}"
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await _make_api_call(client, url)
        
        if res.status_code == 429:
            # wait 60s, retry once
            time.sleep(60) # Or await asyncio.sleep(60), wait, it's an async function so await asyncio.sleep is better!
            import asyncio
            await asyncio.sleep(60)
            res = await _make_api_call(client, url)
            if res.status_code == 429:
                raise AviationstackRateLimitedError("Rate limit exceeded")
                
        data = res.json()
        
        raw_rows = []
        for flight in data.get("data", [])[:max_results]:
            dep = flight.get("departure", {})
            arr = flight.get("arrival", {})
            f_info = flight.get("flight", {})
            airline = flight.get("airline", {})
            
            dep_time_str = dep.get("scheduled")
            arr_time_str = arr.get("scheduled")
            
            duration_mins = 120 # Default
            if dep_time_str and arr_time_str:
                try:
                    dt_dep = datetime.fromisoformat(dep_time_str.replace("Z", "+00:00"))
                    dt_arr = datetime.fromisoformat(arr_time_str.replace("Z", "+00:00"))
                    duration_mins = max(1, int((dt_arr - dt_dep).total_seconds() / 60))
                except Exception:
                    pass
            
            raw_rows.append({
                "flight_iata": f_info.get("iata"),
                "airline_iata": airline.get("iata"),
                "dep_iata": dep.get("iata"),
                "arr_iata": arr.get("iata"),
                "dep_time": dep_time_str,
                "arr_time": arr_time_str,
                "duration_minutes": duration_mins,
                "stops": 0,
                "price_inr": None
            })
            
        # Cache for 1 hour
        _FLIGHT_CACHE[cache_key] = (now + 3600, raw_rows)
        return raw_rows
