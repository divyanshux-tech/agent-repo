import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from services.weather_service import get_weather, resolve_destination_coordinates, determine_packing_advice, weather_cache

@pytest.fixture(autouse=True)
def reset_cache():
    weather_cache.cache.clear()

@pytest.mark.asyncio
@patch("services.weather_service.httpx.AsyncClient")
async def test_resolve_coordinates_success(mock_client):
    mock_res = MagicMock()
    mock_res.json.return_value = {
        "results": [{"name": "Munnar", "latitude": 10.08, "longitude": 77.06, "timezone": "Asia/Kolkata"}]
    }
    # Setup async context manager
    mock_client_instance = AsyncMock()
    mock_client_instance.get.return_value = mock_res
    mock_client.return_value.__aenter__.return_value = mock_client_instance

    res = await resolve_destination_coordinates("Munnar")
    assert res is not None
    assert res["latitude"] == 10.08
    assert res["longitude"] == 77.06
    
    # Check Cache
    cached = await resolve_destination_coordinates("Munnar")
    assert cached["latitude"] == 10.08
    # get should not have been called a second time because of cache
    assert mock_client_instance.get.call_count == 1

@pytest.mark.asyncio
@patch("services.weather_service.httpx.AsyncClient")
async def test_resolve_coordinates_not_found(mock_client):
    mock_res = MagicMock()
    mock_res.json.return_value = {"results": []}
    mock_client_instance = AsyncMock()
    mock_client_instance.get.return_value = mock_res
    mock_client.return_value.__aenter__.return_value = mock_client_instance

    res = await resolve_destination_coordinates("UnknownCityXYZ")
    assert res is None

def test_determine_packing_advice_rain():
    daily = {
        "precipitation_sum": [15, 2, 0],
        "temperature_2m_min": [20, 21, 20],
        "temperature_2m_max": [25, 26, 25]
    }
    advice = determine_packing_advice(daily)
    assert "umbrella" in advice
    assert "raincoat" in advice

def test_determine_packing_advice_cold():
    daily = {
        "precipitation_sum": [0, 0, 0],
        "temperature_2m_min": [2, -1, 4],
        "temperature_2m_max": [10, 12, 11]
    }
    advice = determine_packing_advice(daily)
    assert "heavy jacket" in advice
    assert "thermals" in advice

def test_determine_packing_advice_hot():
    daily = {
        "precipitation_sum": [0, 0, 0],
        "temperature_2m_min": [25, 26, 27],
        "temperature_2m_max": [38, 40, 39]
    }
    advice = determine_packing_advice(daily)
    assert "sunscreen" in advice
    assert "sunglasses" in advice
    assert "light cotton clothes" in advice

@pytest.mark.asyncio
@patch("services.weather_service.resolve_destination_coordinates")
@patch("services.weather_service._fetch_open_meteo")
@patch("services.weather_service.get_llm_provider")
async def test_get_weather_success(mock_llm, mock_fetch, mock_resolve):
    mock_resolve.return_value = {"name": "Leh", "latitude": 34.1, "longitude": 77.5, "timezone": "Asia/Kolkata"}
    mock_fetch.return_value = {
        "daily": {
            "precipitation_sum": [0],
            "temperature_2m_min": [5],
            "temperature_2m_max": [15]
        }
    }
    
    mock_llm_instance = AsyncMock()
    mock_llm_instance.generate_text.return_value = "It will be quite chilly in Leh with highs of 15°C."
    mock_llm.return_value = mock_llm_instance
    
    res = await get_weather("Leh", "en")
    
    assert res.destination == "Leh"
    assert "chilly" in res.summary
    assert "light jacket" in res.packing_advice
    assert res.error is None
    assert res.source == "open-meteo"

@pytest.mark.asyncio
@patch("services.weather_service.resolve_destination_coordinates")
async def test_get_weather_geo_failure(mock_resolve):
    mock_resolve.return_value = None
    res = await get_weather("InvalidCityName")
    assert res.error == "destination_not_found"
    assert "I couldn't determine the location" in res.summary
