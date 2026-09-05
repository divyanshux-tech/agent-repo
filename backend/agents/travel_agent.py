import asyncio
from datetime import datetime, timedelta
from models.candidate import FlightCandidate, TrainCandidate

async def search_flights(source_iata: str, dest_iata: str, date_str: str, passengers: int):
    # Mock data for flights
    now = datetime.now()
    dep_time = datetime.strptime(date_str, "%Y-%m-%d") if date_str else now + timedelta(days=14)
    dep_time = dep_time.replace(hour=8, minute=0)
    
    return [
        FlightCandidate(
            id="T1",
            carrier="IndiGo",
            from_iata=source_iata or "DEL",
            to_iata=dest_iata or "GOI",
            departure=dep_time,
            arrival=dep_time + timedelta(hours=2, minutes=30),
            duration_minutes=150,
            stops=0,
            price_inr=5200 * (passengers or 1),
            source_reference="MOCK_AV_123",
            expires_at=now + timedelta(hours=2)
        ),
        FlightCandidate(
            id="T2",
            carrier="Air India",
            from_iata=source_iata or "DEL",
            to_iata=dest_iata or "GOI",
            departure=dep_time + timedelta(hours=4),
            arrival=dep_time + timedelta(hours=7),
            duration_minutes=180,
            stops=1,
            price_inr=4800 * (passengers or 1),
            source_reference="MOCK_AV_456",
            expires_at=now + timedelta(hours=2)
        )
    ]

async def search_trains(source_station: str, dest_station: str, date_str: str, passengers: int):
    # Mock data for trains
    now = datetime.now()
    dep_time = datetime.strptime(date_str, "%Y-%m-%d") if date_str else now + timedelta(days=14)
    dep_time = dep_time.replace(hour=15, minute=0)
    
    return [
        TrainCandidate(
            id="T3",
            train_name="Rajdhani Express",
            train_number="12432",
            from_station=source_station or "NDLS",
            to_station=dest_station or "MAO",
            departure=dep_time,
            arrival=dep_time + timedelta(hours=24),
            duration_minutes=1440,
            travel_class="3A",
            price_inr=2200 * (passengers or 1),
            availability="AVAILABLE",
            source_reference="MOCK_IR_123",
            expires_at=now + timedelta(hours=2)
        ),
        TrainCandidate(
            id="T4",
            train_name="Goa Express",
            train_number="12780",
            from_station=source_station or "NDLS",
            to_station=dest_station or "MAO",
            departure=dep_time + timedelta(hours=2),
            arrival=dep_time + timedelta(hours=36),
            duration_minutes=2040,
            travel_class="SL",
            price_inr=850 * (passengers or 1),
            availability="AVAILABLE",
            source_reference="MOCK_IR_456",
            expires_at=now + timedelta(hours=2)
        )
    ]

async def search_travel(source: str, destination: str, date_str: str, passengers: int):
    # Run both in parallel
    flights, trains = await asyncio.gather(
        search_flights(source, destination, date_str, passengers),
        search_trains(source, destination, date_str, passengers),
        return_exceptions=True
    )
    return {
        "flights": flights if not isinstance(flights, Exception) else [],
        "trains": trains if not isinstance(trains, Exception) else [],
    }