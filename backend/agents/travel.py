import asyncio
import json
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional

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
    trip_id: Optional[str] = None,
    from_code: str,
    to_code: str,
    date: datetime,
    travellers: int = 1,
    max_flight_results: int = 5,
    max_train_results: int = 5,
) -> TravelSearchResult:

    st_from = find_by_city(from_code)
    st_to = find_by_city(to_code)

    if not st_from:
        raise ValueError(f"Origin '{from_code}' not found. Use city name or IATA code like DEL, BOM, BLR.")
    if not st_to:
        raise ValueError(f"Destination '{to_code}' not found. Use city name or IATA code like GOI, COK, IXL.")

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
        warnings.append(f"Flights: {str(results[0])}")
    else:
        raw_flights = results[0] or []

    raw_trains = []
    if isinstance(results[1], Exception):
        warnings.append(f"Trains: {str(results[1])}")
    else:
        raw_trains = results[1] or []

    if not raw_flights and not raw_trains and not warnings:
        warnings.append("No flights or trains found for this route.")

    candidates: List[TravelCandidate] = []

    # Process Flights
    for f in raw_flights:
        if f.get("price_inr") is None:
            f["price_inr"] = get_flight_price(f.get("dep_iata", ""), f.get("arr_iata", ""))

    raw_flights.sort(key=lambda x: (x.get("duration_minutes", 999), x.get("price_inr", 999999)))

    t_id_seq = 1
    now_utc = datetime.now(timezone.utc)
    expires = now_utc + timedelta(hours=24)

    for f in raw_flights[:max_flight_results]:
        try:
            dt_dep = datetime.fromisoformat(f["dep_time"].replace("Z", "+00:00")) if f.get("dep_time") else now_utc
            dt_arr = datetime.fromisoformat(f["arr_time"].replace("Z", "+00:00")) if f.get("arr_time") else now_utc
            pref = f"AV_{f.get('flight_iata', uuid.uuid4().hex[:6])}"
            cand = TravelCandidate(
                id=f"T{t_id_seq}",
                type="flight",
                provider="aviationstack",
                provider_reference=pref,
                from_code=f.get("dep_iata", from_code.upper()[:8]),
                to_code=f.get("arr_iata", to_code.upper()[:8]),
                departure=dt_dep,
                duration_minutes=max(1, f.get("duration_minutes", 90)),
                price_inr=max(0, f.get("price_inr", 5000)),
                carrier=f.get("airline_iata"),
                flight_number=f.get("flight_iata"),
                arrival=dt_arr,
                stops=f.get("stops", 0),
                expires_at=expires,
                fetched_at=now_utc
            )
            candidates.append(cand)
            t_id_seq += 1
        except Exception as e:
            warnings.append(f"Skipped flight: {e}")

    # Process Trains
    raw_trains = [t for t in raw_trains if t.get("duration_minutes", 9999) <= 2160]

    for t in raw_trains:
        cheapest = min((c.get("price_inr", 999999) for c in t.get("classes", [])), default=0)
        t["_sort_price"] = cheapest

    raw_trains.sort(key=lambda x: (x.get("duration_minutes", 999), x.get("_sort_price", 0)))

    for t in raw_trains[:max_train_results]:
        try:
            dt_dep = now_utc
            try:
                t_time = datetime.strptime(t["dep_time"], "%H:%M").time()
                dt_dep = datetime.combine(date.date(), t_time).replace(tzinfo=timezone.utc)
            except Exception:
                pass

            pref = f"IR_{t.get('train_number', uuid.uuid4().hex[:6])}"
            c_opts = []
            for c in t.get("classes", []):
                try:
                    c_opts.append(TrainClassOption(**c))
                except Exception:
                    pass

            if not c_opts:
                c_opts = [TrainClassOption(class_code="SL", price_inr=500, availability="available")]

            cand = TravelCandidate(
                id=f"T{t_id_seq}",
                type="train",
                provider="indian_rail",
                provider_reference=pref,
                from_code=t.get("from_station_code", from_code.upper()[:8]),
                to_code=t.get("to_station_code", to_code.upper()[:8]),
                departure=dt_dep,
                duration_minutes=max(1, t.get("duration_minutes", 300)),
                price_inr=c_opts[0].price_inr,
                train_name=t.get("train_name"),
                train_number=t.get("train_number"),
                class_options=c_opts,
                expires_at=expires,
                fetched_at=now_utc
            )
            candidates.append(cand)
            t_id_seq += 1
        except Exception as e:
            warnings.append(f"Skipped train: {e}")

    # Dedupe
    seen = {}
    for c in candidates:
        k = (c.from_code, c.to_code, c.departure.isoformat(), c.duration_minutes)
        if k not in seen or c.price_inr < seen[k].price_inr:
            seen[k] = c

    final_cands = list(seen.values())

    # Persist to Supabase only if we have a real trip_id
    if trip_id and supabase:
        try:
            supabase.table("trip_candidates")\
                .update({"superseded_at": now_utc.isoformat()})\
                .eq("trip_id", trip_id)\
                .in_("type", ["flight", "train"])\
                .is_("superseded_at", "null")\
                .execute()

            if final_cands:
                inserts = [{
                    "trip_id": trip_id,
                    "type": c.type,
                    "provider": c.provider,
                    "provider_reference": c.provider_reference,
                    "data_json": c.model_dump_json(),
                    "price_inr": c.price_inr,
                    "expires_at": c.expires_at.isoformat(),
                    "superseded_at": None,
                    "created_at": now_utc.isoformat()
                } for c in final_cands]
                supabase.table("trip_candidates").insert(inserts).execute()
        except Exception as e:
            warnings.append(f"Persistence error: {str(e)}")

    return TravelSearchResult(
        trip_id=trip_id,
        candidates=final_cands,
        warnings=warnings,
        fetched_at=now_utc
    )
