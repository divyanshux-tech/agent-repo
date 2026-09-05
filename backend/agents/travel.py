import asyncio
import json
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import List

from models.travel_schemas import TravelCandidate, TravelSearchResult, TrainClassOption
from services.stations import find_by_city
from services.aviationstack import search_flights
from services.indian_rail import search_trains
from db.supabase_client import supabase

BANDS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "flight_price_bands.json")

def load_flight_price_bands():
    try:
        with open(BANDS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

PRICE_BANDS = load_flight_price_bands()

def get_flight_price(from_iata: str, to_iata: str) -> int:
    key = f"{from_iata}-{to_iata}"
    band = PRICE_BANDS.get(key, {"standard": 6500})
    return band.get("standard", 6500)

async def run_travel_agent(
    *,
    trip_id: str,
    from_code: str,
    to_code: str,
    date: datetime,
    travellers: int,
    max_flight_results: int = 5,
    max_train_results: int = 5,
) -> TravelSearchResult:
    
    st_from = find_by_city(from_code)
    st_to = find_by_city(to_code)
    
    if not st_from:
        raise ValueError(f"Origin '{from_code}' not found in stations")
    if not st_to:
        raise ValueError(f"Destination '{to_code}' not found in stations")
        
    warnings = []
    
    flight_task = asyncio.create_task(
        search_flights(from_iata=st_from.iata, to_iata=st_to.iata, date=date)
    )
    train_task = asyncio.create_task(
        search_trains(from_station_code=st_from.code, to_station_code=st_to.code, date=date)
    )
    
    results = await asyncio.gather(flight_task, train_task, return_exceptions=True)
    
    raw_flights = []
    if isinstance(results[0], Exception):
        warnings.append(f"Flights Error: {str(results[0])}")
    else:
        raw_flights = results[0]
        
    raw_trains = []
    if isinstance(results[1], Exception):
        warnings.append(f"Trains Error: {str(results[1])}")
    else:
        raw_trains = results[1]
        
    if not raw_flights and not raw_trains and not warnings:
        warnings.append("No flights or trains available for this route.")
        
    candidates: List[TravelCandidate] = []
    
    # Process Flights
    # Sort by duration ASC, price ASC (price is estimated here)
    for f in raw_flights:
        if f["price_inr"] is None:
            f["price_inr"] = get_flight_price(f["dep_iata"], f["arr_iata"])
            
    raw_flights.sort(key=lambda x: (x["duration_minutes"], x["price_inr"]))
    
    t_id_seq = 1
    now_utc = datetime.now(timezone.utc)
    expires = now_utc + timedelta(hours=24)
    
    for f in raw_flights[:max_flight_results]:
        dt_dep = datetime.fromisoformat(f["dep_time"].replace("Z", "+00:00")) if f.get("dep_time") else now_utc
        dt_arr = datetime.fromisoformat(f["arr_time"].replace("Z", "+00:00")) if f.get("arr_time") else now_utc
        
        pref = f"AV_{f.get('flight_iata', uuid.uuid4().hex[:6])}"
        
        cand = TravelCandidate(
            id=f"T{t_id_seq}",
            type="flight",
            provider="aviationstack",
            provider_reference=pref,
            from_code=f["dep_iata"],
            to_code=f["arr_iata"],
            departure=dt_dep,
            duration_minutes=f["duration_minutes"],
            price_inr=f["price_inr"],
            carrier=f.get("airline_iata"),
            flight_number=f.get("flight_iata"),
            arrival=dt_arr,
            stops=f.get("stops", 0),
            expires_at=expires,
            fetched_at=now_utc
        )
        candidates.append(cand)
        t_id_seq += 1
        
    # Process Trains
    # Filter > 36 hours
    raw_trains = [t for t in raw_trains if t["duration_minutes"] <= 2160]
    
    for t in raw_trains:
        # Get cheapest available class for sorting
        cheapest = 999999
        for c in t.get("classes", []):
            if c.get("price_inr", cheapest) < cheapest:
                cheapest = c.get("price_inr", cheapest)
        t["_sort_price"] = cheapest if cheapest != 999999 else 0
        
    raw_trains.sort(key=lambda x: (x["duration_minutes"], x["_sort_price"]))
    
    for t in raw_trains[:max_train_results]:
        dt_dep = now_utc # Assuming string, needs real parsing if real API, using now_utc for mock
        try:
            # We mock time parsing just in case RapidAPI returns simple "08:00" strings. We attach it to the requested date.
            t_time = datetime.strptime(t["dep_time"], "%H:%M").time()
            dt_dep = datetime.combine(date.date(), t_time).replace(tzinfo=timezone.utc)
        except Exception:
            pass
            
        pref = f"IR_{t.get('train_number', uuid.uuid4().hex[:6])}"
        
        # Parse classes
        c_opts = []
        for c in t.get("classes", []):
            c_opts.append(TrainClassOption(**c))
            
        if not c_opts:
            c_opts = [TrainClassOption(class_code="SL", price_inr=500, availability="available")]
            
        cand = TravelCandidate(
            id=f"T{t_id_seq}",
            type="train",
            provider="indian_rail",
            provider_reference=pref,
            from_code=t["from_station_code"],
            to_code=t["to_station_code"],
            departure=dt_dep,
            duration_minutes=t["duration_minutes"],
            price_inr=c_opts[0].price_inr,
            train_name=t.get("train_name"),
            train_number=t.get("train_number"),
            class_options=c_opts,
            expires_at=expires,
            fetched_at=now_utc
        )
        candidates.append(cand)
        t_id_seq += 1
        
    # Dedupe identical matches (extremely rare but rule says keep cheaper)
    final_cands = []
    seen = {} # (from, to, dep, duration) -> cand
    for c in candidates:
        # Make a hashable key
        k = (c.from_code, c.to_code, c.departure.isoformat(), c.duration_minutes)
        if k in seen:
            existing = seen[k]
            if c.price_inr < existing.price_inr:
                seen[k] = c
        else:
            seen[k] = c
            
    final_cands = list(seen.values())
    
    # Persist to Supabase
    try:
        # Supersede old
        supabase.table("trip_candidates")\
            .update({"superseded_at": now_utc.isoformat()})\
            .eq("trip_id", trip_id)\
            .in_("type", ["flight", "train"])\
            .is_("superseded_at", "null")\
            .execute()
            
        # Insert new
        if final_cands:
            inserts = []
            for c in final_cands:
                inserts.append({
                    "trip_id": trip_id,
                    "type": c.type,
                    "provider": c.provider,
                    "provider_reference": c.provider_reference,
                    "data_json": c.model_dump_json(),
                    "price_inr": c.price_inr,
                    "expires_at": c.expires_at.isoformat(),
                    "superseded_at": None,
                    "created_at": now_utc.isoformat()
                })
            supabase.table("trip_candidates").insert(inserts).execute()
    except Exception as e:
        warnings.append(f"Persistence error: {str(e)}")
        
    return TravelSearchResult(
        trip_id=trip_id,
        candidates=final_cands,
        warnings=warnings,
        fetched_at=now_utc
    )
