# Plan Through Us — AI Travel Agent
### Full Implementation Plan · Hinglish-First · Voice-Native · India-Focused

> **What this agent is:** A smart, voice-first AI travel co-pilot that understands you in Hindi, Hinglish, or English — searches real flights, trains, and hotels, builds a budget-optimised itinerary, and books everything in one conversation. Not a search engine. Not a chatbot. A travel partner that does the work.

---

## Core Principles (unchanged — these are non-negotiable)

**One shared wallet, not separate category budgets.** Live APIs provide options → specialist agents interpret and filter them → the planner combines them → the user chooses → only then does booking happen.

**Golden rule:** A live trip session is temporary working state (T1, T2, H1, H2…). It is *not* an ML dataset. Permanent data (users, trips, provider references, estimates, bookings, audit history) lives in the durable database.

**Six responsibilities — never mix them:**

| Component | Responsibility | Must NOT do |
|---|---|---|
| Orchestrator Agent | Talk to user, maintain trip state, route requests | Book anything, optimise budget |
| Destination Recommendation Agent | Shortlist destinations | Query every travel/hotel API for every destination |
| Travel Agent | Curate flight + train candidates | Spend the whole budget on travel |
| Hotel Agent | Curate hotel candidates | Decide final budget allocation |
| Activity Agent | Curate activities and experiences | Force activities as mandatory |
| Trip Expense Estimator | Estimate food and local transport costs | Present estimates as guaranteed costs |
| Budget Optimizer | Combine everything under one total budget | Pre-assign per-category sub-budgets |
| Booking Service | Book only after user selects a plan | Run before plan selection |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    INPUT CHANNELS                               │
│   Voice (Bhashini ASR → Hinglish text)  │  Text Chat           │
│   Language: Hindi / English / Hinglish / Tamil / Telugu         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│               ORCHESTRATOR AGENT (Gemini 2.0 Flash)             │
│   Intent parser · Slot filler · State machine · Memory inject   │
│   Routes: planning / knowledge Q&A / weather / replan / booking │
└──┬──────────────┬──────────────┬──────────────┬─────────────────┘
   │              │              │              │
   ▼              ▼              ▼              ▼
RAG Layer    Destination    Weather Tool   Trip Memory
(knowledge   Agent          (Open-Meteo)   (Supabase)
 Q&A)        │
             ▼
   ┌─────────────────────────────────────────┐
   │     PARALLEL SPECIALIST AGENTS          │
   │  Travel Agent  │ Hotel Agent │ Activity  │
   │  (Flights +    │ (Amadeus*   │ Agent     │
   │   Trains)      │  + OSM)     │ (catalog) │
   └────────────────┴─────────────┴───────────┘
             │
             ▼
   Trip Expense Estimator (food + local transport)
             │
             ▼
   Budget Optimizer → 3–5 Ranked Plans
             │
             ▼
   Plan Presentation UI → User Selects
             │
             ▼
   Booking Service (revalidate → pay → confirm)
             │
             ▼
   Post-Booking Companion (itinerary · checklist · tracker)
             │
             ▼
   OUTPUT CHANNELS
   Text reply  │  Voice reply (Bhashini TTS)
```

> **Improvement from original:** Two new layers added — RAG knowledge layer between the Orchestrator and Destination Agent (so factual questions about destinations are grounded, not hallucinated), and Post-Booking Companion layer (so the agent's value doesn't end at confirmation). Train search is merged into the Travel Agent as a peer to flights, not a separate system.

---

## Free API Stack

All APIs below are confirmed free-tier as of this plan. No paid contracts.

| Need | Service | Free Tier | Notes |
|---|---|---|---|
| LLM / Agent | **Google Gemini 2.0 Flash** | Generous free tier | Already integrated, use for all agent reasoning |
| LLM fallback | **Groq (Llama 3.x)** | Free, very fast | For cheap tool-calling loops where Gemini is slow |
| Flight search | **Aviationstack** | 500 calls/mo free | Real-time flights, routes, schedules |
| Flight search (backup) | **OpenSky Network** | Free, no key | Live aircraft + route data |
| Trains | **Indian Rail API via RapidAPI** | Free tier | PNR, trains between stations, schedule |
| Hotels | **OpenTripMap** | Free | POI + stay data, no rate anxiety |
| Hotels (backup) | **OSM Overpass API** | Free, no key | Accommodation POIs via OpenStreetMap |
| Maps / routing | **OpenStreetMap + OSRM + Nominatim** | Free, no key | Already in use for routing |
| Geocoding | **Photon** | Free, no key | Already in use |
| Weather | **Open-Meteo** | Free, no key | 7-day forecast, no key needed |
| Voice STT | **Bhashini ASR** (Govt. of India) | Free | 22 Indian languages, primary |
| Voice STT fallback | **Web Speech API** | Free, in-browser | Zero-dependency fallback |
| Voice TTS | **Bhashini TTS** | Free | Same service, speak back in user's language |
| Voice TTS fallback | **Web Speech speechSynthesis** | Free, in-browser | Browser-native fallback |
| Knowledge / NLP | **HuggingFace Inference API** | Free tier | Sentence-transformer embeddings for RAG |
| Media | **Cloudinary** | Free tier | Document vault file storage |
| Database | **Supabase** | Free tier | PostgreSQL + Realtime + Storage |
| Auth | **Clerk** | Free tier | Already in use |
| Deployment | **Render** | Free tier (spins down) | Replace HuggingFace Spaces — use Render for FastAPI agent backend |
| Web search | **Tavily** | 1000 calls/mo free | Agent web discovery for destination info |

> **Note on Amadeus:** Amadeus Self-Service has ended its free test environment. It is removed from this plan. Aviationstack (flights) + Indian Rail API (trains) + OpenTripMap (hotels/stays) replace it entirely with no paid commitment.

---

## Feature 1 — Voice-First Input & Output

**What it does:** The user speaks into the agent in Hindi, Hinglish, Tamil, Telugu, Bengali, Marathi, or English. The agent speaks the reply back in the same language. Most Indian travelers are far more comfortable speaking than typing English travel queries — this is the primary input channel, not an add-on.

**How to implement:**

1. A mic button in the chat composer. Tap to start, live waveform while recording, auto-stop on 2s silence.
2. Stream audio to **Bhashini ASR** endpoint. Show live interim transcript so the user sees it working.
3. Detect language from the transcript (Bhashini returns language tag; supplement with `franc` library for Hinglish detection).
4. Pass raw transcript directly to the Orchestrator — do not normalise Hinglish. "Mujhe Goa ke liye flight chahiye next Friday" goes in as-is.
5. Agent reply text is passed to **Bhashini TTS**, audio plays back in the same language.
6. A speaker toggle (persistent in `localStorage`) lets the user mute voice replies.
7. Web Speech API (`SpeechRecognition` + `speechSynthesis`) is the fallback when Bhashini is unreachable or language is English.

**APIs:**
- Bhashini ASR: `https://bhashini.gov.in/ulca/api/v0/model/compute` (POST, free, registration required)
- Bhashini TTS: same endpoint, different pipeline ID
- Web Speech API: in-browser, no key

**All voice code lives in one module:** `src/services/voiceService.js` exporting `listen()`, `speak()`, `detectLanguage()`, `cancel()`. Nothing else imports voice logic directly.

**Error states handled:**
- Mic permission denied → show "Allow microphone access in browser settings"
- No speech detected → "Kuch suna nahi — dobara bolein?" (Nothing heard — please try again)
- Bhashini unreachable → silent fallback to Web Speech, no error shown to user
- Network lost mid-speech → clear the partial transcript, show retry prompt

**Acceptance criteria:**
- [ ] "मुझे अक्टूबर में केरल जाना है ₹30,000 में" → real Kerala itinerary
- [ ] Reply spoken back in Hindi
- [ ] A Hinglish query ("Flights Delhi to Goa next Friday under 5000") works end-to-end
- [ ] Mic-denied shows a helpful message, not a silent failure
- [ ] Web Speech fallback works with Bhashini disabled

---

## Feature 2 — Multilingual Hinglish NLU (Orchestrator Intelligence)

**What it does:** The Orchestrator understands free-form, code-mixed, half-English-half-Hindi queries and maps them to structured intent + trip requirements. "Hotel change karo, budget thoda zyada kar" → `{ intent: "CHANGE_HOTEL", budget_delta: "increase" }`.

**How to implement:**

Gemini 2.0 Flash handles intent parsing natively. Structure the system prompt to:
1. Accept transliterated Hindi ("chahiye", "kitna", "kab") without normalising
2. Extract structured fields: source, destination, dates, days, travellers, budget, interests, constraints
3. Output a strict JSON intent object (defined schema, Gemini's JSON mode)
4. Ask slot-filling follow-ups only for genuinely missing required fields — not all at once

**Action vocabulary (unchanged + extended):**

| Action | Trigger |
|---|---|
| `START_PLANNING` | New trip request |
| `RECOMMEND_DESTINATIONS` | "Kahaan jaayein?" / "Where should I go?" |
| `SEARCH_COMPONENTS` | Destination locked, run parallel agents |
| `CHANGE_HOTEL` | "Hotel change karo" |
| `CHANGE_TRAVEL` | "Doosri flight dikhao" |
| `CHANGE_ACTIVITY` | "Kuch aur karna hai" |
| `UPDATE_BUDGET` | "Budget ₹45,000 kar do" |
| `REPLAN_ALL` | "Sab kuch badlo" |
| `CONFIRM_BOOKING` | "Book kar do" / "Pakka karo" |
| `ASK_KNOWLEDGE` | "Hampi mein kya dekhein?" → routes to RAG |
| `GET_WEATHER` | "Manali mein kaisa mausam hai?" → routes to Open-Meteo |
| `EXPLAIN_PLAN` | "Yeh plan kyun suggest kiya?" → routes to explainability |
| `GET_ITINERARY` | "Day-by-day plan banao" → routes to Itinerary Generator |

**State machine (unchanged):**
`planning → review → selected_for_booking → booked`

Minimal-recompute rule: "Change hotel" only reruns Hotel Agent + Optimizer, not Travel Agent.

**Acceptance criteria:**
- [ ] Correctly parses 10 varied Hinglish/English test phrasings
- [ ] "Change X" triggers only the relevant specialist agent
- [ ] Trip state persists across browser sessions (resumable)

---

## Feature 3 — RAG Knowledge Layer (Grounded Destination Q&A)

**What it does:** When a user asks "Is October good for Spiti?", "What are entry fees for Hampi?", "Is Leh accessible in December?" — the agent answers from a real knowledge base, not from hallucination. Retrieved chunks are injected into the Orchestrator's prompt as context.

**Why this matters:** Without RAG, Gemini will confidently give wrong entry fees, wrong road-opening dates, and wrong seasonal advice. Grounded answers build trust and reduce the #1 failure mode of travel AI.

**How to implement:**

1. **Corpus:** ~40 major destinations + ~25 hidden gems + festival calendar + activity data. Each chunk: destination name, month-by-month suitability, entry fees, timings, what to pack, etiquette, known pitfalls, local transport options. Store as JSON, ~500 tokens per chunk.
2. **Embedding:** HuggingFace Inference API with `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (multilingual, handles Hindi + English). Embed all chunks once, store vectors in a JSON file (at this scale — ~65 chunks × 384 dims — a flat FAISS-style cosine search in memory is fine, no vector DB needed).
3. **Retrieval:** On `ASK_KNOWLEDGE` intent, embed the query, cosine-search top 3 chunks, inject into Gemini prompt: `"Use this context to answer: [chunks]. Question: [user query]"`.
4. **Freshness:** Static corpus for MVP (update manually). Mark each chunk with a `last_updated` date so stale data is flagged in the UI.

**APIs:**
- HuggingFace Inference API: `https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (free tier)
- Tavily: for live web search when RAG misses ("What is the current status of Rohtang Pass?")

**Acceptance criteria:**
- [ ] "October mein Spiti jaana theek hai?" returns a grounded, accurate answer
- [ ] Answer cites the knowledge source ("Based on seasonal data")
- [ ] Tavily fallback fires when corpus has no matching chunk

---

## Feature 4 — Destination Recommendation Agent

**What it does:** Narrows India's destinations to a 3–6 place shortlist *before* any expensive live API calls. For signed-in users, recommendations factor in their past trips and saved places. For new users, content + seasonality only.

**How to implement (improved from original):**

Original plan used tag-based hard filtering. This is upgraded to a hybrid scorer:

```
score(destination) =
  α × interest_match(user_interests, destination_tags)
  + β × season_fit(current_month, destination_season_months)
  + γ × budget_fit(destination_typical_cost_tier, user_budget)
  + δ × novelty_bonus (long-tail: ≥20% of slate reserved for lesser-known destinations)
```

Weights (α=0.4, β=0.3, γ0.2, δ=0.1) are tunable. The novelty bonus ensures the agent doesn't always suggest Goa and Rajasthan — it actively pushes Ziro Valley, Mawlynnong, Chand Baori, Tawang into the slate.

**Destination metadata (seed ~65 entries):**
```json
{
  "id": "ziro-valley",
  "name": "Ziro Valley",
  "state": "Arunachal Pradesh",
  "tags": ["offbeat", "nature", "tribal-culture", "festival", "trekking"],
  "season_months": [3,4,5,9,10,11],
  "typical_cost_tier": "budget",
  "footfall": "low",
  "lat": 27.5,
  "lng": 93.8,
  "summary": "Remote valley of the Apatani tribe, famous for the Ziro Music Festival"
}
```

**Explainability:** Every recommendation returns a human-readable reason:
`"Because you mentioned trekking and offbeat places, and October is peak season for Arunachal Pradesh"`

**API:** No live API needed — static metadata + scoring function. Runs entirely in the agent backend.

**Acceptance criteria:**
- [ ] Shortlist generates without calling any live travel/hotel API
- [ ] At least 1 of every 5 recommendations is a lesser-known destination
- [ ] Every recommendation includes a plain-English explanation

---

## Feature 5 — Travel Agent (Flights + Trains, parallel)

**What it does:** Once destination is locked, searches flights AND trains as alternatives under the same budget. Returns curated candidates — not raw API dumps. The user sees "Flight ₹6,200 (2h 15m)" next to "Train (Rajdhani) ₹1,450 (overnight)" and the optimizer picks across both.

**Flights:**

- Primary: **Aviationstack** for routes, schedules, carrier info
- Query: `GET https://api.aviationstack.com/v1/flights?access_key=KEY&dep_iata=DEL&arr_iata=GOI&flight_date=2026-10-15`
- Extract: carrier, departure, arrival, duration, stops, price (Aviationstack free tier gives schedule data; price displayed as estimate from historical ranges or shown as "check carrier site" for booking redirect)
- Fallback: **OpenSky Network** for live aircraft + route existence confirmation

**Trains:**

- Primary: **Indian Rail API via RapidAPI** (free tier)
- Query trains between source and destination station codes, return Rajdhani/Shatabdi/Express options with class prices and duration
- Extract: train number, name, class, departure, arrival, duration, price (INR), availability status
- Display: train name + number, class options (3A/2A/SL), duration, price — shown as a train card alongside flight boarding pass card

**Candidate output (Flight):**
```json
{
  "id": "T1",
  "type": "flight",
  "carrier": "IndiGo",
  "from": "DEL", "to": "GOI",
  "departure": "2026-10-15T06:00",
  "arrival": "2026-10-15T08:20",
  "duration_minutes": 140,
  "stops": 0,
  "price_inr": 6200,
  "source_reference": "AV_abc123",
  "expires_at": "2026-10-14T18:00"
}
```

**Candidate output (Train):**
```json
{
  "id": "T2",
  "type": "train",
  "train_name": "Goa Express",
  "train_number": "10103",
  "from": "NDLS", "to": "MAO",
  "departure": "2026-10-15T15:00",
  "arrival": "2026-10-16T11:30",
  "duration_minutes": 1230,
  "class": "3A",
  "price_inr": 1450,
  "source_reference": "IR_xyz789",
  "expires_at": "2026-10-14T18:00"
}
```

**Acceptance criteria:**
- [ ] Both flight and train candidates returned for any metro-to-metro route
- [ ] Train options shown for routes where trains exist (Delhi–Goa, Mumbai–Goa, Delhi–Jaipur)
- [ ] Each candidate traceable to raw API response via source_reference
- [ ] Candidates stored with expires_at — stale candidates excluded at booking time

---

## Feature 6 — Hotel Agent

**What it does:** Searches stays near the destination across budget tiers. Returns candidates with price, rating, location, and cancellation policy. Multiple price tiers so the optimizer can mix and match.

**How to implement:**

- Primary: **OpenTripMap API** — `GET https://api.opentripmap.com/0.1/en/places/radius?radius=5000&lon=73.8&lat=15.5&kinds=accomodations&format=json&apikey=KEY` (free, 10k calls/day)
- Enrich with OSM Overpass for additional stay data: `[out:json]; node["tourism"="hotel"](around:5000,lat,lon);`
- Extract: name, lat/lng, category (hostel/guesthouse/hotel), user rating where available
- Estimate price tier from category + destination cost profile (budget/standard/premium bands in INR)
- Return 5 candidates across tiers: 1 budget, 2 standard, 2 premium

**Candidate output:**
```json
{
  "id": "H1",
  "name": "Palolem Beach Resort",
  "lat": 15.01, "lon": 74.02,
  "category": "hotel",
  "rating": 4.2,
  "price_total_inr": 7500,
  "nights": 5,
  "price_band": "standard",
  "cancellation": "Free cancellation until 2 days before",
  "source_reference": "OTM_h456"
}
```

**Acceptance criteria:**
- [ ] Returns candidates across at least 2 price tiers for any supported destination
- [ ] OSM fallback fires when OpenTripMap returns < 3 results
- [ ] No hotel candidate shown without a price estimate

---

## Feature 7 — Activity Agent (Season-Aware)

**What it does:** Suggests region-specific activities that match the season, user interests, difficulty preference, and remaining budget. Activities are optional — user can skip entirely.

**How to implement:**

Seed a static catalog of ~120 activities in `src/data/activities.json`:

```json
{
  "id": "rishikesh-rafting",
  "name": "White Water Rafting",
  "region": "Rishikesh",
  "state": "Uttarakhand",
  "lat": 30.1, "lng": 78.3,
  "category": "adventure",
  "season_months": [2,3,4,9,10,11],
  "difficulty": "moderate",
  "price_band_inr": 1500,
  "duration_hrs": 4,
  "operator_note": "16km stretch, Grade III-IV rapids"
}
```

Seed activities include: rafting (Rishikesh), paragliding (Bir-Billing), scuba (Havelock), camel safari (Jaisalmer), tea-trail walk (Munnar), Kedarkantha trek, Rann Utsav, Ziro Music Festival, houseboat stay (Kerala), Hampi bouldering, Spiti monastery circuit, Dzukou Valley trek, Dudhsagar waterfall hike, Goa carnival, Pushkar camel fair.

**Filtering logic:**
1. `destination_region` match
2. `season_months` includes current/travel month
3. `price_band_inr` × traveller_count fits remaining budget
4. `category` intersects user interests

The engine rotates featured activities by current month — "What's happening in India this October?" returns Rann Utsav, Ziro Music Festival, Hampi season-open.

**Acceptance criteria:**
- [ ] Activity candidates respect season — no "Kedarkantha winter trek" in July
- [ ] Featured rotation changes by month automatically
- [ ] Activities correctly excluded when user says "no activities"

---

## Feature 8 — Trip Expense Estimator

**What it does:** Estimates non-bookable costs — food, local transport (autos, local buses, rickshaws) — per destination. Shown transparently as estimates, never as guaranteed costs. This is the critical piece that prevents the "I budgeted ₹30k but actually spent ₹42k" problem.

**No change from original architecture — keeping as-is.**

Destination cost profile table (`destination_cost_profiles`):

| destination | food_per_day_inr | local_transport_per_day_inr | profile_level |
|---|---|---|---|
| Goa | 800 | 400 | standard |
| Ladakh | 600 | 600 | standard |
| Kerala | 500 | 300 | standard |
| Rajasthan | 400 | 250 | budget |

Output clearly labeled: `"~₹7,000 estimated for food (standard profile) — not charged by us"`

**Acceptance criteria:**
- [ ] Estimator has cost profiles for all 40+ supported destinations
- [ ] UI shows estimates with a clear "~" prefix and tooltip explaining the label

---

## Feature 9 — Budget Optimizer

**What it does:** Combines Travel + Hotel + Activity candidates + expense estimates under the single total budget. Ranks feasible combinations into 3–5 plans with distinct positioning labels.

**No change from original architecture** — enumeration approach is correct for MVP.

**Improvement added:** Scoring function now factors in two soft signals alongside price:

1. **Sustainability score** (0–1): low-impact destinations score higher. Computed from footfall tier (low/medium/high) + destination fragility tag. Ziro Valley > Goa on this axis.
2. **Crowd score** (0–1): off-peak travel window preference. Computed from month vs destination's peak_months. Adds a "quieter option" label when the travel date avoids the destination's peak.

**Plan labels (extended):**

| Label | Optimises for |
|---|---|
| Best Value | Lowest total cost, all constraints met |
| Best Experience | Highest hotel rating + best activity match |
| Sustainable Choice | Best sustainability score, low footfall |
| Offbeat Pick | ≥1 long-tail destination in activity slate |
| Better Travel | Shortest flight / best train class |

Show 3–5 plans. Nothing is booked at this stage.

**Acceptance criteria:**
- [ ] Optimizer correctly filters infeasible combinations
- [ ] "Sustainable Choice" plan present when a low-footfall destination is in the slate
- [ ] Plans persist to `trip_plans` table with stable label and estimated_total

---

## Feature 10 — Day-by-Day Itinerary Generator

**What it does:** After the user selects a plan, generates a real day-by-day itinerary — not just "Plan B: T2 + H3 + A3" but "Day 1: Land Goa 8:20am, check in Palolem Beach Resort, sunset at Palolem beach, dinner at local beach shack (~₹300/person)." This is what turns a booking into a trip.

**How to implement:**

After plan selection, call Gemini with:
- Locked travel candidates (arrival time, transport type)
- Locked hotel (location, check-in/check-out)
- Locked activities (dates, durations, locations)
- RAG context for the destination (local tips, logistics, timings)
- Trip parameters (days, travellers, budget remaining after bookings)

Prompt Gemini to output structured JSON:

```json
{
  "day": 1,
  "date": "2026-10-15",
  "title": "Arrive & Settle",
  "slots": [
    { "time": "08:20", "type": "travel", "description": "Land at Dabolim Airport, taxi to Palolem (~₹700, 1.5h)" },
    { "time": "10:30", "type": "checkin", "description": "Check in at Palolem Beach Resort" },
    { "time": "16:00", "type": "explore", "description": "Sunset walk on Palolem beach — calm crescent bay, good for swimming" },
    { "time": "19:30", "type": "food", "description": "Dinner at a beach shack (~₹300–500/person)" }
  ],
  "estimated_spend_today_inr": 1500
}
```

Render as a day-by-day timeline in the UI. User can ask "Day 3 mein kuch aur add karo" and the Orchestrator reruns just the Activity Agent + itinerary for that day.

**Acceptance criteria:**
- [ ] Itinerary generated within 10 seconds of plan selection
- [ ] Every day has at least arrival/accommodation/one activity/food slot
- [ ] Per-day estimated spend shown, summing to plan total
- [ ] User can request a change to one day without regenerating the full itinerary

---

## Feature 11 — Weather Tool

**What it does:** Answers "Will it rain in Munnar next week?" and "Kya Leh mein October mein jacket chahiye?" in real time, and also informs the Destination Agent's seasonal scoring behind the scenes.

**How to implement:**

Open-Meteo is free, requires no API key.

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=10.05&longitude=77.06
  &daily=precipitation_sum,temperature_2m_max,temperature_2m_min
  &timezone=Asia/Kolkata
  &forecast_days=7
```

The Orchestrator calls this on `GET_WEATHER` intent. Response is summarised by Gemini into plain language: "Munnar ke liye agle hafte mein halki baarish ki sambhavana hai — raincoat saath rakhein."

Also used passively: when the Destination Agent scores destinations, Open-Meteo's current month data validates the static season tags.

**Acceptance criteria:**
- [ ] Weather query answered in plain Hindi or English, whichever the user spoke
- [ ] Response includes packing advice (jacket / umbrella / sunscreen) based on temperature + precipitation

---

## Feature 12 — Trip Memory (Persistent Context)

**What it does:** The agent remembers the user's previous trips, saved destinations, and preferences across sessions. "Mujhe Rajasthan trip yaad hai — wahi style mein plan karo" works because the agent actually has that context.

**How to implement:**

On every new session start, the Orchestrator queries Supabase for:
1. Last 3 trip summaries (destination, dates, budget tier, travel style)
2. User preference profile (interests, typical budget, preferred travel type)
3. Any in-progress trip state (resume if `status != booked`)

This context is injected as a system prompt prefix: `"User has previously travelled to Rajasthan (Oct 2025, budget ₹35k, heritage + food focus), Coorg (Feb 2026, nature + relaxation)."`

After each session, a rolling summary is written back to Supabase. Keyed by Clerk user ID.

**Supabase tables:**

```sql
CREATE TABLE user_trip_memory (
  id uuid DEFAULT gen_random_uuid(),
  user_id text NOT NULL,          -- Clerk user ID
  trip_summary jsonb NOT NULL,
  preference_profile jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Acceptance criteria:**
- [ ] Second trip by the same user pre-fills interests and style from memory
- [ ] In-progress trip resumes on re-login without re-explaining from scratch
- [ ] Memory injection adds < 500 tokens to the prompt

---

## Feature 13 — Booking Service

**What it does:** Executes the actual booking after plan selection. Revalidates price and availability before charging. Shows any price changes to the user before payment. Records all booking references.

**No change from original architecture — this is solid. Keeping as-is.**

**Revalidation sequence:**
1. Re-query the flight/train API with the locked candidate's source_reference
2. Re-query the hotel API for current availability
3. If price changed by > ₹200 or availability dropped: pause, show user the updated total, require explicit re-confirmation
4. On confirmation: redirect to Razorpay checkout (or show UPI QR for train booking via IRCTC)
5. On success: write to `bookings` table, trigger post-booking companion

**Acceptance criteria:**
- [ ] Booking never proceeds silently on a stale price
- [ ] Hotel sold-out triggers graceful fallback (re-offer optimizer with fresh candidates)
- [ ] Every booking record stores final price, status, and provider confirmation reference

---

## Feature 14 — Replan Logic (Incremental, not Full Recompute)

**What it does:** "Change hotel" only reruns the Hotel Agent and Optimizer — not the Travel Agent or Destination Agent. This keeps the agent snappy and prevents losing good travel candidates found earlier.

**No change from original architecture — keeping as-is.**

| User says | What reruns |
|---|---|
| "Hotel change karo" | Hotel Agent → Optimizer |
| "Doosri flight dikhao" | Travel Agent (flights only) → Optimizer |
| "Train options dikhao" | Travel Agent (trains only) → Optimizer |
| "Budget ₹45k kar do" | Optimizer only |
| "Kuch aur activity add karo" | Activity Agent → Optimizer |
| "Sab kuch badlo" | All specialist agents → Estimator → Optimizer |

**Acceptance criteria:**
- [ ] "Change hotel" does not re-call the flight API
- [ ] Trip state history preserved (old candidates marked superseded, not deleted)

---

## Feature 15 — Post-Booking Companion

**What it does:** After booking, the agent's job isn't done. It becomes a trip companion — generating a packing checklist, storing booking documents, and tracking the user's flight in real time.

**How to implement:**

**15a. Smart Packing Checklist**
Generated by Gemini using: destination + season + trip type (beach/trek/city) + duration.
Stored in `trip_checklists` Supabase table. User can check items off in the UI.

**15b. Document Vault**
Booking confirmations auto-saved to Cloudinary (PDF upload, encrypted). User can also manually upload: visa, ID, travel insurance. Accessible from the agent: "Mera booking confirmation dikhao."

**15c. Live Flight Tracker**
- OpenSky Network: `GET https://opensky-network.org/api/flights/departure?airport=DEL&begin=1697000000&end=1697100000` (free, no key)
- Show flight status (on-time / delayed / landed) in the post-booking UI
- Push notification when flight status changes (browser notification API)

**Acceptance criteria:**
- [ ] Packing checklist generated and shown within 5 seconds of booking confirmation
- [ ] Booking PDF auto-saved to document vault
- [ ] Flight tracker shows live status for booked flight

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id text PRIMARY KEY,              -- Clerk user ID
  preference_profile jsonb,
  created_at timestamptz DEFAULT now()
);

-- Trips (core record)
CREATE TABLE trips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text REFERENCES users(id),
  source text, destination text,
  travel_date date, days int, travellers int,
  total_budget_inr int,
  status text DEFAULT 'planning',   -- planning|review|selected_for_booking|booked
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Requirements extracted from chat
CREATE TABLE trip_requirements (
  trip_id uuid REFERENCES trips(id),
  interests text[],
  constraints jsonb,
  spending_style text,             -- budget|standard|premium
  raw_conversation_summary text
);

-- Curated candidates (flights, trains, hotels, activities)
CREATE TABLE trip_candidates (
  id text PRIMARY KEY,             -- T1, T2, H1, A1 etc.
  trip_id uuid REFERENCES trips(id),
  type text,                       -- FLIGHT|TRAIN|HOTEL|ACTIVITY
  provider text,
  provider_reference text,
  data_json jsonb,
  price_inr int,
  expires_at timestamptz,
  superseded_at timestamptz        -- set when replaced by replan, not deleted
);

-- Non-bookable expense estimates
CREATE TABLE trip_cost_estimates (
  trip_id uuid REFERENCES trips(id),
  food_estimate_inr int,
  local_transport_estimate_inr int,
  estimation_method text,
  profile_level text,
  confidence text
);

-- Ranked plans from optimizer
CREATE TABLE trip_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid REFERENCES trips(id),
  travel_candidate_id text,
  hotel_candidate_id text,
  activity_candidate_ids text[],
  estimated_total_inr int,
  label text,                      -- Best Value|Best Experience|Sustainable Choice etc.
  sustainability_score float,
  created_at timestamptz DEFAULT now()
);

-- User's selected plan
CREATE TABLE selected_plans (
  trip_id uuid REFERENCES trips(id),
  plan_id uuid REFERENCES trip_plans(id),
  selected_at timestamptz DEFAULT now()
);

-- Bookings (after payment)
CREATE TABLE bookings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid REFERENCES trips(id),
  component_type text,
  provider text,
  provider_reference text,
  final_price_inr int,
  status text,
  confirmation_reference text,
  document_url text                -- Cloudinary URL for confirmation PDF
);

-- Trip memory (cross-session)
CREATE TABLE user_trip_memory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text REFERENCES users(id),
  trip_summary jsonb,
  preference_profile jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Packing checklists
CREATE TABLE trip_checklists (
  trip_id uuid REFERENCES trips(id),
  items jsonb,                     -- [{item, category, checked}]
  generated_at timestamptz DEFAULT now()
);
```

---

## Deployment

| Layer | Service | Notes |
|---|---|---|
| Frontend | **Vercel** | Free tier, auto-deploy from GitHub |
| Agent backend (FastAPI) | **Render** | Free tier (spins down after inactivity — acceptable for academic demo) |
| Database | **Supabase** | PostgreSQL + Realtime + Storage, free tier |
| Media / documents | **Cloudinary** | Free tier for document vault PDFs |
| Auth | **Clerk** | Free tier |

> **Render vs HuggingFace Spaces:** HuggingFace no longer offers free CPU persistent deployments. Render's free tier gives a persistent FastAPI service with 512MB RAM — sufficient for the agent backend, embedding search, and the activity/destination catalog. The service spins down after 15 minutes of inactivity (cold start ~30s on free tier — acceptable for a demo, note this in the pitch).

---

## Build Order

Build strictly in this order — each phase is testable before the next begins:

| Phase | What to build | Test signal |
|---|---|---|
| 1 | Supabase schema, Render FastAPI skeleton | Schema migrations applied, /health endpoint live |
| 2 | Orchestrator + Hinglish NLU (text only) | 10 test queries parse correctly |
| 3 | Destination metadata + scoring function | Shortlist returns in < 200ms, explains each pick |
| 4 | Travel Agent — trains (Indian Rail API) | Train candidates returned for Delhi→Goa |
| 5 | Travel Agent — flights (Aviationstack) | Flight candidates returned for same route |
| 6 | Hotel Agent (OpenTripMap + OSM) | 5 candidates across 2 price tiers |
| 7 | Activity Agent (static catalog) | Season-filtered activities for October Kerala |
| 8 | Expense Estimator | Cost profiles for 10 destinations |
| 9 | Budget Optimizer | 3 ranked plans for a test trip |
| 10 | RAG knowledge layer | "Is October good for Spiti?" answered correctly |
| 11 | Itinerary Generator | Day-by-day plan generated from selected plan |
| 12 | Weather Tool | Hindi weather summary for any Indian city |
| 13 | Voice input (Bhashini ASR + Web Speech fallback) | Hindi query processed end-to-end |
| 14 | Voice output (Bhashini TTS) | Reply spoken back in user's language |
| 15 | Trip Memory (Supabase) | Second session resumes without re-explaining |
| 16 | Booking Service (Razorpay + revalidation) | Test booking completes with confirmation |
| 17 | Post-booking companion (checklist + tracker) | Checklist generated, flight status shown |
| 18 | Replan logic | "Change hotel" does not re-call flight API |
| 19 | Polish, error states, demo rehearsal | All acceptance criteria pass |

---

## Real-World Problems This Agent Addresses

These map directly to demonstrable, real issues in Indian tourism:

1. **Language barrier in digital travel:** Most online travel platforms are English-only. A farmer in MP or a first-time traveler from a Tier-3 city can use this agent in Hindi or their regional language — entirely by voice if needed.

2. **Price opacity and hidden costs:** The shared-wallet model with transparent "booked vs estimated" cost breakdown prevents the classic "flight was ₹5k but the trip cost ₹40k" budget shock.

3. **Overtourism at popular sites:** The long-tail floor in recommendations (≥20% of every slate is a lesser-known destination) and the Sustainable Choice plan label actively push demand toward places like Ziro Valley and Mawlynnong instead of always defaulting to Goa and Jaipur.

4. **Train vs flight blind spot:** Most travel AI ignores Indian trains, which carry 8 billion passengers per year. Showing train options alongside flights as genuine alternatives is a gap no major travel AI fills today.

5. **Cold-start discovery:** Most travel apps are useless on first use — they show popular destinations regardless of who you are. The content + seasonality scorer makes a useful first recommendation without needing prior data.

6. **Post-booking abandonment:** Existing platforms end their relationship at the booking confirmation. The post-booking companion (checklist, document vault, live tracker) extends the relationship through the trip itself.

---

## Acceptance Criteria (Full Agent)

- [ ] "मुझे अक्टूबर में पाँच दिन केरल जाना है ₹30,000 में" → real day-by-day itinerary with train + hotel + activities, spoken back in Hindi
- [ ] A Hinglish query ("Goa trip plan karo, 4 din, 2 log, 25k budget") parses correctly and returns 3 ranked plans
- [ ] Train options shown for all metro-to-metro routes (Delhi–Goa, Delhi–Jaipur, Mumbai–Goa)
- [ ] Weather query answered in plain Hindi with packing advice
- [ ] "Hotel change karo" does not re-call the flight API
- [ ] At least 1 of every 5 destination recommendations is a lesser-known destination
- [ ] Every recommendation comes with a plain-English explanation of why it was suggested
- [ ] Voice input works in Chrome with Bhashini; falls back to Web Speech elsewhere
- [ ] Booking revalidates price before charging; shows price change to user if > ₹200
- [ ] Second session resumes trip without re-explaining from scratch
- [ ] No secret API key exposed in the client bundle — all third-party calls proxied through the Render backend

---

*Built for academic demonstration. All APIs used are confirmed free-tier. No paid contracts.*
