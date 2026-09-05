import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.travel import router
from models.travel_schemas import TravelSearchRequest, TravelCandidate
from services.aviationstack import AviationstackRateLimitedError
from services.indian_rail import IndianRailAuthError

app = FastAPI()
app.include_router(router, prefix="/api/v1/travel")

client = TestClient(app)

@pytest.mark.asyncio
async def test_search_travel_agent_both_success():
    with patch("agents.travel.search_flights", new_callable=AsyncMock) as mock_f, \
         patch("agents.travel.search_trains", new_callable=AsyncMock) as mock_t, \
         patch("agents.travel.supabase") as mock_supabase:
         
        mock_f.return_value = [
            {"dep_iata": "DEL", "arr_iata": "GOI", "duration_minutes": 150, "price_inr": None, "dep_time": "2024-01-01T10:00:00Z", "flight_iata": "6E123"}
        ]
        mock_t.return_value = [
            {"from_station_code": "NDLS", "to_station_code": "MAO", "duration_minutes": 1800, "classes": [{"price_inr": 2500, "class_code": "3A", "availability": "available"}], "dep_time": "15:00"}
        ]
        
        req = {
            "trip_id": "123e4567-e89b-12d3-a456-426614174000",
            "from_code": "Delhi",
            "to_code": "Goa",
            "date": "2024-01-01T00:00:00Z",
            "travellers": 2
        }
        
        res = client.post("/api/v1/travel/search", json=req)
        print("Response:", res.json())
        assert res.status_code == 200
        data = res.json()
        assert len(data["candidates"]) == 2
        assert data["candidates"][0]["type"] == "flight"
        assert data["candidates"][1]["type"] == "train"

@pytest.mark.asyncio
async def test_search_travel_agent_flight_fails():
    with patch("agents.travel.search_flights", new_callable=AsyncMock) as mock_f, \
         patch("agents.travel.search_trains", new_callable=AsyncMock) as mock_t, \
         patch("agents.travel.supabase") as mock_supabase:
         
        # Simulate rate limit
        mock_f.side_effect = AviationstackRateLimitedError("Rate limit exceeded")
        mock_t.return_value = [
            {"from_station_code": "NDLS", "to_station_code": "MAO", "duration_minutes": 1800, "classes": [{"price_inr": 2500, "class_code": "3A", "availability": "available"}], "dep_time": "15:00"}
        ]
        
        req = {
            "trip_id": "123e4567-e89b-12d3-a456-426614174000",
            "from_code": "Delhi",
            "to_code": "Goa",
            "date": "2024-01-01T00:00:00Z",
            "travellers": 2
        }
        
        res = client.post("/api/v1/travel/search", json=req)
        print("Response:", res.json())
        assert res.status_code == 200
        data = res.json()
        
        # We should still get the train candidate!
        assert len(data["candidates"]) == 1
        assert data["candidates"][0]["type"] == "train"
        assert len(data["warnings"]) > 0
        assert "Rate limit" in data["warnings"][0]
