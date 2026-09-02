// ============================================================
// src/agents/planner/serpApiClient.js
// SerpAPI Client Module for Google Flights & Google Hotels
// ============================================================

require('dotenv').config();

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

// IATA Airport Code map for common Indian cities
const CITY_TO_IATA = {
  'delhi': 'DEL',
  'new delhi': 'DEL',
  'mumbai': 'BOM',
  'goa': 'GOI',
  'bangalore': 'BLR',
  'bengaluru': 'BLR',
  'chennai': 'MAA',
  'kolkata': 'CCU',
  'hyderabad': 'HYD',
  'kochi': 'COK',
  'cochin': 'COK',
  'jaipur': 'JAI',
  'manali': 'KUU',
  'shimla': 'SLV',
  'srinagar': 'SXR',
  'udaipur': 'UDR',
  'varanasi': 'VNS',
  'ahmedabad': 'AMD',
  'pune': 'PNQ',
};

function getIataCode(cityName) {
  if (!cityName) return 'DEL';
  const clean = cityName.trim().toLowerCase();
  return CITY_TO_IATA[clean] || clean.toUpperCase().slice(0, 3);
}

/**
 * Fetch live flight options from SerpAPI (Google Flights)
 */
async function searchGoogleFlights({ source, destination, travelDate, travellers = 1, currency = 'INR' }) {
  const depIata = getIataCode(source);
  const arrIata = getIataCode(destination);
  const formattedDate = travelDate ? new Date(travelDate).toISOString().split('T')[0] : '2026-10-15';

  if (!SERPAPI_KEY || SERPAPI_KEY === 'your_serpapi_key_here') {
    console.log('[serpApiClient] SERPAPI_KEY not set — using realistic provider simulator for flights.');
    return generateFallbackFlights(source, destination, depIata, arrIata, formattedDate, travellers);
  }

  try {
    const params = new URLSearchParams({
      engine: 'google_flights',
      departure_id: depIata,
      arrival_id: arrIata,
      outbound_date: formattedDate,
      adults: String(travellers),
      currency: currency,
      hl: 'en',
      gl: 'in',
      api_key: SERPAPI_KEY,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);

    const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`, {
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`SerpAPI Flights error HTTP ${response.status}`);
    }

    const data = await response.json();
    const flightResults = data.best_flights || data.other_flights || [];

    if (!flightResults || flightResults.length === 0) {
      console.warn('[serpApiClient] No live SerpAPI flight results found, falling back to simulated inventory.');
      return generateFallbackFlights(source, destination, depIata, arrIata, formattedDate, travellers);
    }

    return flightResults.slice(0, 5).map((item, idx) => {
      const flightInfo = item.flights?.[0] || {};
      const price = item.price || (6000 + idx * 1500);
      const stops = (item.flights?.length || 1) - 1;
      const airline = flightInfo.airline || 'IndiGo';
      const flightNum = flightInfo.flight_number || `6E-${100 + idx}`;

      return {
        alias: `T${idx + 1}`,
        provider: 'Google Flights (SerpAPI)',
        providerReference: `SERP_FLIGHT_${depIata}_${arrIata}_${idx + 1}`,
        price: Number(price),
        currency: currency,
        metadataJson: {
          airline,
          flightNumber: flightNum,
          from: depIata,
          to: arrIata,
          departureTime: flightInfo.departure_token || `${formattedDate}T10:00:00Z`,
          arrivalTime: flightInfo.arrival_token || `${formattedDate}T12:30:00Z`,
          durationMinutes: item.total_duration || 150,
          stops,
          baggage: '15kg check-in, 7kg cabin',
        },
      };
    });
  } catch (err) {
    console.log(`[serpApiClient] Live flight search provider unavailable (${err.message.split('\n')[0]}). Using fallback inventory.`);
    return generateFallbackFlights(source, destination, depIata, arrIata, formattedDate, travellers);
  }
}

/**
 * Fetch live hotel options from SerpAPI (Google Hotels)
 */
async function searchGoogleHotels({ destination, checkInDate, checkOutDate, travellers = 2, currency = 'INR' }) {
  const checkIn = checkInDate ? new Date(checkInDate).toISOString().split('T')[0] : '2026-10-15';
  const checkOut = checkOutDate ? new Date(checkOutDate).toISOString().split('T')[0] : '2026-10-20';

  if (!SERPAPI_KEY || SERPAPI_KEY === 'your_serpapi_key_here') {
    console.log('[serpApiClient] SERPAPI_KEY not set — using realistic provider simulator for hotels.');
    return generateFallbackHotels(destination, checkIn, checkOut, travellers);
  }

  try {
    const params = new URLSearchParams({
      engine: 'google_hotels',
      q: `Hotels in ${destination}`,
      check_in_date: checkIn,
      check_out_date: checkOut,
      adults: String(travellers),
      currency: currency,
      gl: 'in',
      hl: 'en',
      api_key: SERPAPI_KEY,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);

    const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`, {
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`SerpAPI Hotels error HTTP ${response.status}`);
    }

    const data = await response.json();
    const hotelResults = data.properties || [];

    if (!hotelResults || hotelResults.length === 0) {
      console.warn('[serpApiClient] No live SerpAPI hotel results found, falling back to simulated inventory.');
      return generateFallbackHotels(destination, checkIn, checkOut, travellers);
    }

    return hotelResults.slice(0, 5).map((item, idx) => {
      const pricePerNight = item.rate_per_night?.extracted_lowest || (1500 + idx * 1000);
      const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))) || 5;
      const totalPrice = pricePerNight * nights;

      return {
        alias: `H${idx + 1}`,
        provider: 'Google Hotels (SerpAPI)',
        providerReference: `SERP_HOTEL_${item.property_token || idx + 1}`,
        price: Number(totalPrice),
        currency: currency,
        metadataJson: {
          hotelName: item.name || `${destination} Resort ${idx + 1}`,
          rating: item.overall_rating || (3.8 + idx * 0.3),
          pricePerNight,
          totalNights: nights,
          amenities: item.amenities || ['Free Wi-Fi', 'Air Conditioning', 'Pool'],
          cancellation: 'Free cancellation until 48h prior',
          link: item.link || null,
        },
      };
    });
  } catch (err) {
    console.log(`[serpApiClient] Live hotel search provider unavailable (${err.message.split('\n')[0]}). Using fallback inventory.`);
    return generateFallbackHotels(destination, checkIn, checkOut, travellers);
  }
}

// ── Fallback Generators ──────────────────────────────────────

function generateFallbackFlights(source, destination, depIata, arrIata, formattedDate, travellers) {
  return [
    {
      alias: 'T1',
      provider: 'IndiGo (Simulated)',
      providerReference: `SIM_T1_${depIata}_${arrIata}`,
      price: 8000 * travellers,
      currency: 'INR',
      metadataJson: { airline: 'IndiGo', flightNumber: '6E-204', from: depIata, to: arrIata, stops: 0, durationMinutes: 140, baggage: '15kg' },
    },
    {
      alias: 'T2',
      provider: 'Air India (Simulated)',
      providerReference: `SIM_T2_${depIata}_${arrIata}`,
      price: 9500 * travellers,
      currency: 'INR',
      metadataJson: { airline: 'Air India', flightNumber: 'AI-805', from: depIata, to: arrIata, stops: 0, durationMinutes: 135, baggage: '25kg' },
    },
    {
      alias: 'T3',
      provider: 'Vistara (Simulated)',
      providerReference: `SIM_T3_${depIata}_${arrIata}`,
      price: 12000 * travellers,
      currency: 'INR',
      metadataJson: { airline: 'Vistara', flightNumber: 'UK-815', from: depIata, to: arrIata, stops: 1, durationMinutes: 210, baggage: '20kg' },
    },
  ];
}

function generateFallbackHotels(destination, checkIn, checkOut, travellers) {
  return [
    {
      alias: 'H1',
      provider: 'StaySim (Simulated)',
      providerReference: 'SIM_H1',
      price: 6000,
      currency: 'INR',
      metadataJson: { hotelName: `Budget Stay ${destination}`, rating: 3.8, pricePerNight: 1200, totalNights: 5, cancellation: 'Free cancellation' },
    },
    {
      alias: 'H2',
      provider: 'StaySim (Simulated)',
      providerReference: 'SIM_H2',
      price: 8000,
      currency: 'INR',
      metadataJson: { hotelName: `Beachside Hotel ${destination}`, rating: 4.3, pricePerNight: 1600, totalNights: 5, cancellation: 'Free cancellation' },
    },
    {
      alias: 'H3',
      provider: 'StaySim (Simulated)',
      providerReference: 'SIM_H3',
      price: 10000,
      currency: 'INR',
      metadataJson: { hotelName: `Premium Resort ${destination}`, rating: 4.7, pricePerNight: 2000, totalNights: 5, cancellation: 'Free cancellation' },
    },
  ];
}

module.exports = {
  searchGoogleFlights,
  searchGoogleHotels,
  getIataCode,
};
