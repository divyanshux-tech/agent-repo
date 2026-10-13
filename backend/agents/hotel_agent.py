import os
import httpx
import asyncio
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from models.candidate import HotelCandidate

# OpenTripMap API base URL
OPENTRIPMAP_BASE_URL = "https://api.opentripmap.io/0.1/en/places"
# OSM Overpass API endpoint
OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter"

# Cache for geocoding results to avoid repeated calls for same destination
_GEOCACHE: Dict[str, tuple[float, float]] = {}

async def _get_coordinates(destination: str) -> Optional[tuple[float, float]]:
    """
    Get latitude and longitude for a destination using OpenTripMap geocoding.
    Returns (lat, lon) or None if not found.
    """
    # Check cache first
    if destination in _GEOCACHE:
        return _GEOCACHE[destination]

    api_key = os.environ.get("OPENTRIPMAP_API_KEY")
    if not api_key:
        # Fallback to mock coordinates if no API key
        # These are approximate coordinates for popular destinations
        mock_coords = {
            "goa": (15.2993, 74.1240),
            "delhi": (28.6139, 77.2090),
            "mumbai": (19.0760, 72.8777),
            "bangalore": (12.9716, 77.5946),
            "kerala": (10.8505, 76.2711),
            "rajasthan": (27.0238, 74.2179),
            "ladakh": (34.1526, 77.5770),
            "kasol": (32.0072, 77.3109),
            "rishikesh": (30.0869, 78.2676),
            "darjeeling": (27.0360, 88.2627),
        }
        key = destination.lower().strip()
        if key in mock_coords:
            return mock_coords[key]
        # Default to Delhi coordinates if not found
        return (28.6139, 77.2090)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Use OpenTripMap geocoding
            url = f"{OPENTRIPMAP_BASE_URL}/geoname"
            params = {
                "name": destination,
                "apikey": api_key
            }
            response = await client.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                lat = data.get("lat")
                lon = data.get("lon")
                if lat is not None and lon is not None:
                    coord = (float(lat), float(lon))
                    _GEOCACHE[destination] = coord
                    return coord
    except Exception as e:
        print(f"Geocoding failed for {destination}: {e}")

    return None

async def _search_opentripmap_hotels(lat: float, lon: float, radius: int = 5000) -> List[Dict[str, Any]]:
    """
    Search for hotels/accommodations near coordinates using OpenTripMap.
    Returns list of raw place data.
    """
    api_key = os.environ.get("OPENTRIPMAP_API_KEY")
    if not api_key:
        return []

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{OPENTRIPMAP_BASE_URL}/radius"
            params = {
                "radius": radius,
                "lon": lon,
                "lat": lat,
                "kinds": "accomodations",  # Note: OpenTripMap uses "accomodations" spelling
                "format": "json",
                "apikey": api_key,
                "limit": 20  # Get more results to filter from
            }
            response = await client.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                return data.get("features", [])
    except Exception as e:
        print(f"OpenTripMap hotel search failed: {e}")

    return []

async def _search_osm_hotels(lat: float, lon: float, radius: int = 5000) -> List[Dict[str, Any]]:
    """
    Search for hotels using OSM Overpass API as fallback.
    Returns list of raw place data in a format similar to OpenTripMap.
    """
    try:
        # Overpass QL query to find hotels, hostels, guesthouses within radius
        query = f"""
        [out:json][timeout:10];
        (
          node["tourism"="hotel"](around:{radius},{lat},{lon});
          node["tourism"="hostel"](around:{radius},{lat},{lon});
          node["tourism"="guesthouse"](around:{radius},{lat},{lon});
          node["tourism"="chalet"](around:{radius},{lat},{lon});
          node["tourism"="apartment"](around:{radius},{lat},{lon});
          node["tourism"="camp_site"](around:{radius},{lat},{lon});
          way["tourism"="hotel"](around:{radius},{lat},{lon});
          way["tourism"="hostel"](around:{radius},{lat},{lon});
          way["tourism"="guesthouse"](around:{radius},{lat},{lon});
        );
        out center;
        """

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                OVERPASS_ENDPOINT,
                data=query,
                headers={"Content-Type": "text/plain"}
            )
            if response.status_code == 200:
                data = response.json()
                # Convert Overpass response to a format similar to OpenTripMap features
                features = []
                for element in data.get("elements", []):
                    # Get coordinates (either direct or from center)
                    lat_coord = element.get("lat") or (element.get("center", {}).get("lat") if element.get("center") else None)
                    lon_coord = element.get("lon") or (element.get("center", {}).get("lon") if element.get("center") else None)

                    if lat_coord is None or lon_coord is None:
                        continue

                    tags = element.get("tags", {})

                    # Determine category from tags
                    category = tags.get("tourism", "hotel")
                    if category not in ["hotel", "hostel", "guesthouse", "chalet", "apartment", "camp_site"]:
                        category = "hotel"  # default

                    # Create a feature-like object
                    feature = {
                        "properties": {
                            "name": tags.get("name", f"Stay {len(features)+1}"),
                            "rating": None,  # OSM doesn't have standard rating
                            "price_level": None,  # OSM doesn't have price level
                            "address": tags.get("addr:full") or tags.get("addr:street") or "",
                        },
                        "geometry": {
                            "coordinates": [float(lon_coord), float(lat_coord)]
                        }
                    }
                    features.append(feature)

                return features
    except Exception as e:
        print(f"OSM hotel search failed: {e}")

    return []

def _extract_hotel_info(feature: Dict[str, Any], nights: int = 1) -> Optional[HotelCandidate]:
    """
    Extract hotel information from a place feature and convert to HotelCandidate.
    Returns None if essential information is missing.
    """
    try:
        props = feature.get("properties", {})
        geom = feature.get("geometry", {})
        coords = geom.get("coordinates", [])

        if len(coords) < 2:
            return None

        lon, lat = coords[0], coords[1]
        name = props.get("name", "").strip()
        if not name:
            return None

        # Extract category from kinds or default to hotel
        kinds = props.get("kinds", "")
        category = "hotel"  # default
        if kinds:
            kinds_list = [k.strip() for k in kinds.split(",")]
            # Map OpenTripMap kinds to our categories
            kind_mapping = {
                "hostel": "hostel",
                "guesthouse": "guesthouse",
                "chalet": "hotel",
                "apartment": "hotel",
                "camp_site": "hotel",
                "hotel": "hotel"
            }
            for kind in kinds_list:
                if kind in kind_mapping:
                    category = kind_mapping[kind]
                    break

        # Extract rating (OpenTripMap has rate field)
        rating = None
        rate_val = props.get("rate")
        if rate_val is not None:
            try:
                rating = float(rate_val)
                # OpenTripMap rating is typically 0-5, but let's ensure it's in range
                if rating < 0 or rating > 5:
                    rating = None
            except (ValueError, TypeError):
                pass

        # Estimate price based on price_level or default
        # OpenTripMap price_level: 1=cheap, 2=moderate, 3=expensive, 4=very expensive
        price_level = props.get("price_level")
        base_price_per_night = 1000  # default budget price in INR
        if price_level is not None:
            try:
                level = int(price_level)
                if level == 1:
                    base_price_per_night = 800   # budget
                elif level == 2:
                    base_price_per_night = 1500  # standard
                elif level == 3:
                    base_price_per_night = 3000  # premium
                elif level >= 4:
                    base_price_per_night = 5000  # luxury
            except (ValueError, TypeError):
                pass

        price_total = base_price_per_night * nights

        # Determine price band
        if price_total <= 1000 * nights:
            price_band = "budget"
        elif price_total <= 3000 * nights:
            price_band = "standard"
        else:
            price_band = "premium"

        # Generate a unique ID
        import hashlib
        id_string = f"{name}_{lat}_{lon}"
        hotel_id = "H" + hashlib.md5(id_string.encode()).hexdigest()[:8].upper()

        # Create source reference
        source_ref = f"OTM_{hotel_id}"

        # Set expiration to 24 hours from now
        expires_at = datetime.now(timezone.utc).replace(hour=23, minute=59, second=59)

        return HotelCandidate(
            id=hotel_id,
            name=name,
            lat=lat,
            lon=lon,
            category=category,
            rating=rating,
            price_total_inr=int(price_total),
            nights=nights,
            price_band=price_band,
            cancellation="Free cancellation until 24 hours before check-in",  # Standard message
            source_reference=source_ref,
            expires_at=expires_at
        )
    except Exception as e:
        print(f"Failed to extract hotel info from feature: {e}")
        return None

async def search_hotels(destination: str, checkin: str, checkout: str, guests: int, nights: int = 4) -> List[HotelCandidate]:
    """
    Search for hotels near a destination.
    Returns list of HotelCandidate objects.
    """
    # Get coordinates for destination
    coords = await _get_coordinates(destination)
    if not coords:
        # If we can't get coordinates, return empty list
        return []

    lat, lon = coords

    # Try OpenTripMap first
    raw_results = await _search_opentripmap_hotels(lat, lon)

    # If we don't get enough results, try OSM as fallback
    if len(raw_results) < 3:
        osm_results = await _search_osm_hotels(lat, lon)
        raw_results.extend(osm_results)

    # Process results into HotelCandidate objects
    hotels: List[HotelCandidate] = []
    seen_names = set()  # Avoid duplicates

    for feature in raw_results:
        hotel = _extract_hotel_info(feature, nights)
        if hotel and hotel.name not in seen_names:
            seen_names.add(hotel.name)
            hotels.append(hotel)

            # Limit to 10 results to avoid too many options
            if len(hotels) >= 10:
                break

    # Sort by rating (descending) then by price (ascending)
    hotels.sort(key=lambda h: (h.rating or 0, -h.price_total_inr), reverse=True)

    return hotels