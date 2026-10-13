# Project Context: Plan Through Us (Nura AI)

## Overview
This is an AI travel agent project called "Plan Through Us" (powered by Nura AI) - a voice-first AI travel co-pilot for Indian travelers that understands Hindi, Hinglish, or English, searches real flights/trains/hotels, builds budget-optimized itineraries, and books everything in one conversation.

Key features from README:
- Voice-first input/output with Bhashini ASR/TTS
- Multilingual Hinglish NLU
- RAG Knowledge Layer for grounded destination Q&A
- Destination Recommendation Agent with novelty bonus
- Travel Agent (flights + trains) using Aviationstack + Indian Rail APIs
- Hotel Agent using OpenTripMap + OSM Overpass
- Activity Agent (season-aware static catalog)
- Trip Expense Estimator
- Budget Optimizer with sustainability and crowd scores
- Day-by-day Itinerary Generator
- Weather Tool
- Trip Memory (cross-session via Supabase)
- Booking Service (Razorpay + revalidation)
- Post-Booking Companion (checklist, document vault, flight tracker)
- Replan Logic (incremental updates)

Tech Stack:
- Backend: Python/FastAPI (Render)
- Frontend: React/Vite (Vercel)
- Database: Supabase
- APIs: Aviationstack, Indian Rail (RapidAPI), OpenTripMap, Geoapify, Tavily, HuggingFace, Google Gemini, Groq, Cloudinary, Clerk, Razorpay, Bhashini, Open-Meteo, OpenSky Network
- Deployment: Backend on Render, Frontend on Vercel

## Recent Work Summary

### Hotel Agent Fix (backend/agents/hotel_agent.py)
**Issue**: Was using mock data instead of real APIs
**Fix**: 
- Implemented real hotel search using OpenTripMap API
- Added OSM Overpass API as fallback
- Used OpenTripMap geocoding service to get destination coordinates
- Added caching for geocoding results
- Returns proper HotelCandidate objects with:
  - Name, coordinates, category (hostel/guesthouse/hotel/resort)
  - Rating (from OpenTripMap), price band (budget/standard/premium)
  - Cancellation policy, source reference, expiration

### Budget Optimizer Improvement (backend/agents/budget_optimizer.py)
**Issue**: Used mock sustainability and crowd scores
**Fix**:
- Implemented real sustainability score based on:
  - Hotel category (hostel/guestget better scores)
  - Activity categories (nature/heritage/adventure get better scores)
- Implemented real crowd score based on:
  - Destination data from destinations.json (footfall, peak_months, season_months)
  - Whether travel month is in peak months (high crowd score) or season but not peak (medium) or off-season (low)
- Improved activity combination generation (singles, pairs, limited triples) to avoid combinatorial explosion
- Enhanced plan ranking using multiple factors: price, sustainability, crowd avoidance, activity count

### Verified Working Components
- **Travel Agent** (backend/agents/travel.py): Already uses real Aviationstack + Indian Rail APIs
- **Activity Agent**: Uses intentional static catalog (per implementation.md)
- **Destination Agent**: Generates explanations using LLM with real destination data
- **Itinerary Generator**: Uses LLM to create realistic day-by-day plans
- **Expense Estimator**: Uses static cost profiles (intentional design)
- **Orchestrator**: Handles intent parsing and state management

### Architecture Notes
The system uses a pipeline/event-driven architecture via Server-Sent Events (SSE) in the chat endpoint:
- Orchestrator parses intent and extracts requirements
- Based on intent, calls relevant agents in parallel where possible
- Emits events: tool_step, state_sync, nlu, destination_cards, agent_candidates, plans, itinerary, etc.
- Frontend consumes these events to update UI

## Working Guidelines
1. Always use real APIs when available - no mock data in production flows
2. Maintain the six clean responsibilities of agents (no cross-domain work)
3. Preserve shared-wallet model: only book after user selects plan
4. Keep latency considerations in mind but prioritize accuracy over speed
5. Use cards appropriately for visual representation of results
6. Handle errors gracefully with fallbacks where appropriate
7. Preserve trip state and enable cross-session resumption
8. When replanning, only rerun necessary agents (incremental logic)

## Git Information
- Repository: divyanshux-tech/agent-repo (GitHub)
- Branch: main (default)
- User is a collaborator with push access