import os
import json
import httpx
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from .llm_provider import get_llm_provider

logger = logging.getLogger(__name__)

class WeatherResponse(BaseModel):
    destination: str
    forecast: list
    summary: str
    packing_advice: List[str]
    source: str
    generated_at: str
    error: Optional[str] = None

# Simple in-memory cache
class CacheManager:
    def __init__(self):
        self.cache: Dict[str, Dict[str, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            entry = self.cache[key]
            if datetime.now() < entry["expires_at"]:
                return entry["data"]
            else:
                del self.cache[key]
        return None

    def set(self, key: str, data: Any, ttl_seconds: int = 3600):
        self.cache[key] = {
            "data": data,
            "expires_at": datetime.now() + timedelta(seconds=ttl_seconds)
        }

weather_cache = CacheManager()

async def resolve_destination_coordinates(destination: str) -> Optional[Dict[str, Any]]:
    # Cache key for geocoding
    cache_key = f"geo:{destination.lower()}"
    cached = weather_cache.get(cache_key)
    if cached:
        return cached

    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {
        "name": destination,
        "count": 1,
        "language": "en",
        "format": "json"
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, params=params, timeout=10.0)
            data = res.json()
            
            results = data.get("results")
            if not results:
                return None
                
            loc = results[0]
            result = {
                "name": loc.get("name"),
                "latitude": loc.get("latitude"),
                "longitude": loc.get("longitude"),
                "timezone": loc.get("timezone", "Asia/Kolkata")
            }
            
            # Cache geocoding for a long time (24h)
            weather_cache.set(cache_key, result, ttl_seconds=86400)
            return result
    except Exception as e:
        logger.error(f"Geocoding failed for {destination}: {e}")
        return None

def determine_packing_advice(forecast_daily: Dict[str, List]) -> List[str]:
    advice = set()
    
    if not forecast_daily or "precipitation_sum" not in forecast_daily:
        return []

    max_precip = max(forecast_daily.get("precipitation_sum", [0]))
    min_temp = min(forecast_daily.get("temperature_2m_min", [20]))
    max_temp = max(forecast_daily.get("temperature_2m_max", [20]))
    
    if max_precip > 10:
        advice.add("raincoat")
        advice.add("umbrella")
    elif max_precip > 2:
        advice.add("umbrella")
        
    if min_temp < 5:
        advice.add("heavy jacket")
        advice.add("thermals")
    elif min_temp < 15:
        advice.add("light jacket")
        advice.add("warm layers")
        
    if max_temp > 35:
        advice.add("light cotton clothes")
        advice.add("sunscreen")
        advice.add("sunglasses")
    elif max_temp > 30:
        advice.add("sunscreen")
        advice.add("sunglasses")
        
    return list(advice)

async def _fetch_open_meteo(lat: float, lon: float, tz: str, forecast_days: int) -> Optional[Dict]:
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "precipitation_sum,temperature_2m_max,temperature_2m_min",
        "timezone": tz,
        "forecast_days": forecast_days
    }
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, params=params, timeout=10.0)
            res.raise_for_status()
            return res.json()
    except Exception as e:
        logger.error(f"Weather API failed: {e}")
        return None

async def get_weather(destination: str, language: str = "en", forecast_days: int = 7) -> WeatherResponse:
    # 1. Resolve coordinates
    geo = await resolve_destination_coordinates(destination)
    if not geo:
        return WeatherResponse(
            destination=destination,
            forecast=[],
            summary="I couldn't determine the location for that destination.",
            packing_advice=[],
            source="open-meteo",
            generated_at=datetime.utcnow().isoformat(),
            error="destination_not_found"
        )
        
    lat, lon, tz = geo["latitude"], geo["longitude"], geo["timezone"]
    
    # 2. Check cache
    # Round lat/lon to 2 decimal places for cache key
    cache_key = f"weather:{round(lat, 2)}:{round(lon, 2)}:{forecast_days}:{tz}"
    weather_data = weather_cache.get(cache_key)
    
    if not weather_data:
        # 3. Fetch from API
        weather_data = await _fetch_open_meteo(lat, lon, tz, forecast_days)
        if not weather_data:
            return WeatherResponse(
                destination=geo["name"],
                forecast=[],
                summary="I’m unable to fetch the latest weather right now. Please try again in a moment.",
                packing_advice=[],
                source="open-meteo",
                generated_at=datetime.utcnow().isoformat(),
                error="api_failure"
            )
            
        weather_cache.set(cache_key, weather_data, ttl_seconds=3600) # 1 hour cache
        
    daily = weather_data.get("daily", {})
    
    # Transform daily lists to list of dicts for easier consumption if needed, 
    # but keeping it as the raw daily dict is also fine. We will pass it to Gemini.
    packing_advice = determine_packing_advice(daily)
    
    # 4. Generate natural language summary using LLMProvider
    llm = get_llm_provider()
    system_prompt = f"""You are summarizing supplied weather data.
Do not invent weather values.
Use only the supplied weather data and user context.
If data is unavailable, say so.
Respond in {language}."""

    user_prompt = f"""
Destination: {geo["name"]}
Forecast Data: {json.dumps(daily)}
Packing Advice: {json.dumps(packing_advice)}

Include:
1. Overall conditions summary (1 sentence)
2. Temperature range (use °C)
3. Rain likelihood
4. What to pack (use the provided packing advice if any)

Keep it under 80 words. Sound like a knowledgeable friend.
"""
    
    summary_text = await llm.generate_text(system_prompt, user_prompt)
    if not summary_text:
        # Fallback if LLM fails
        summary_text = "Weather data retrieved successfully, but couldn't generate a summary."
        
    return WeatherResponse(
        destination=geo["name"],
        forecast=[daily], # Wrap in list to match schema
        summary=summary_text.strip(),
        packing_advice=packing_advice,
        source="open-meteo",
        generated_at=datetime.utcnow().isoformat()
    )