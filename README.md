<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Space+Grotesk&weight=700&size=42&pause=1000&color=6366F1&center=true&vCenter=true&width=700&lines=Plan+Through+Us+%E2%9C%88%EF%B8%8F;Nura+AI+%E2%80%94+Your+Travel+Co-Pilot+%F0%9F%8C%8D;Voice-First.+India-Focused.+Agent-Native." alt="Plan Through Us" />

<br/>

<p align="center">
  <strong>An AI travel agent that understands you in Hindi, Hinglish, or English —<br/>
  searches real flights, trains & hotels, builds a budget-optimised itinerary,<br/>
  and books everything in one conversation.</strong>
</p>

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62E" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-0F172A?style=for-the-badge&logo=tailwind-css&logoColor=38BDF8" />
  <img src="https://img.shields.io/badge/Python-1E293B?style=for-the-badge&logo=python&logoColor=3B82F6" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-1C1C1C?style=for-the-badge&logo=supabase&logoColor=3ECF8E" />
  <img src="https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=groq&logoColor=white" />
  <img src="https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white" />
  <img src="https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white" />
  <img src="https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=black" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

<br/>

<p align="center">
  <a href="#-architecture">Architecture</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-free-api-stack">API Stack</a> ·
  <a href="#-database-schema">Database</a> ·
  <a href="#-getting-started">Getting Started</a> ·
  <a href="#-build-order">Build Order</a>
</p>

</div>

---

## 🧭 What Is This?

**Plan Through Us** (powered by **Nura AI**) is not a search engine. Not a chatbot. It is a **production-grade, voice-first AI travel co-pilot** — a swarm of specialised agents that collaborates in real time to plan, optimise, and book an end-to-end trip for Indian travelers, in their language.

> **"मुझे अक्टूबर में पाँच दिन केरल जाना है ₹30,000 में"**
> → Real day-by-day itinerary, train + hotel + activities, spoken back in Hindi. ✅

**Three non-negotiable principles:**

| Principle | What it means |
|---|---|
| **One shared wallet** | Live APIs → specialist agents → planner → user chooses → only then booking. No hidden category locks. |
| **Durable state** | Live trip session is temporary working state. Users, trips, bookings, history live in Supabase — never lost. |
| **Six clean responsibilities** | Each agent has exactly one job. They never cross into each other's domain. |

---

## 🏗️ Architecture

### System Overview

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#6366F1', 'primaryTextColor': '#fff', 'primaryBorderColor': '#4F46E5', 'lineColor': '#94A3B8', 'secondaryColor': '#0F172A', 'tertiaryColor': '#1E293B', 'background': '#0F172A', 'mainBkg': '#1E293B', 'nodeBorder': '#6366F1', 'clusterBkg': '#1E293B', 'titleColor': '#F1F5F9', 'edgeLabelBackground': '#1E293B', 'fontFamily': 'Space Grotesk, sans-serif'}}}%%
graph TD
    A["🎙️ Voice Input\nBhashini ASR | Web Speech API"] --> C
    B["⌨️ Text Input\nHindi · English · Hinglish"] --> C

    C["🧠 ORCHESTRATOR AGENT\nGemini 2.0 Flash\nIntent Parser · Slot Filler · State Machine · Memory Inject"]

    C --> D["📚 RAG Layer\nGrounded Destination Q&A\nHuggingFace Embeddings + Tavily"]
    C --> E["🗺️ Destination Agent\nHybrid Scorer · Novelty Bonus · Explainability"]
    C --> F["🌤️ Weather Tool\nOpen-Meteo · 7-day Forecast"]
    C --> G["💾 Trip Memory\nSupabase · Cross-Session State"]

    E --> H["✈️ Travel Agent\nFlights via Aviationstack\nTrains via Indian Rail API"]
    E --> I["🏨 Hotel Agent\nOpenTripMap + OSM Overpass"]
    E --> J["🧗 Activity Agent\nStatic Catalog · Season-Aware"]

    H --> K["💸 Trip Expense Estimator\nFood + Local Transport Estimates"]
    I --> K
    J --> K

    K --> L["⚖️ Budget Optimizer\nRanks 3–5 Plans · Sustainability Score"]

    L --> M["🎨 Plan Presentation UI\nReact + SSE Streaming"]
    M --> N{User Selects Plan}

    N --> O["📅 Itinerary Generator\nGemini · Day-by-Day · JSON Output"]
    N --> P["💳 Booking Service\nRevalidate → Razorpay → Confirm"]

    P --> Q["🎒 Post-Booking Companion\nPacking Checklist · Document Vault · Live Flight Tracker"]

    Q --> R["🔊 Voice Output\nBhashini TTS | Web speechSynthesis"]
    Q --> S["📱 Text Response"]

    style C fill:#6366F1,color:#fff,stroke:#4F46E5
    style L fill:#8B5CF6,color:#fff,stroke:#7C3AED
    style P fill:#10B981,color:#fff,stroke:#059669
    style Q fill:#F59E0B,color:#fff,stroke:#D97706
    style D fill:#3B82F6,color:#fff,stroke:#2563EB
```

---

### Agent Responsibility Matrix

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#1E293B', 'primaryTextColor': '#F1F5F9', 'lineColor': '#475569', 'background': '#0F172A'}}}%%
graph LR
    subgraph ORCHESTRATOR ["🧠 Orchestrator — Talk · Route · State"]
        O1["Intent Parsing\n(JSON mode)"]
        O2["Slot Filling\n(Hinglish-native)"]
        O3["State Machine\nplanning→review→booking→booked"]
        O4["Memory Injection\n< 500 tokens"]
    end

    subgraph SPECIALISTS ["⚡ Parallel Specialist Agents"]
        S1["✈️ Travel Agent\nFlights + Trains"]
        S2["🏨 Hotel Agent\nOpenTripMap + OSM"]
        S3["🧗 Activity Agent\n~120 catalog entries"]
    end

    subgraph SYNTHESIS ["🔗 Synthesis Layer"]
        Y1["💸 Expense Estimator\nFood + Local Transport"]
        Y2["⚖️ Budget Optimizer\n1 shared wallet"]
    end

    ORCHESTRATOR --> SPECIALISTS
    SPECIALISTS --> SYNTHESIS

    style ORCHESTRATOR fill:#6366F1,color:#fff
    style SPECIALISTS fill:#8B5CF6,color:#fff
    style SYNTHESIS fill:#10B981,color:#fff
```

---

### State Machine

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#6366F1', 'primaryTextColor': '#fff', 'lineColor': '#94A3B8'}}}%%
stateDiagram-v2
    [*] --> planning : New trip request
    planning --> review : Candidates fetched + ranked
    review --> review : Change hotel / flight / activity / budget
    review --> selected_for_booking : User selects a plan
    selected_for_booking --> booked : Payment confirmed
    selected_for_booking --> review : Price changed > ₹200 or sold out
    booked --> [*] : Post-booking companion activated
```

---

### Replan Logic (Incremental — Never Full Recompute)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#1E293B', 'lineColor': '#6366F1'}}}%%
flowchart LR
    U["User Command"] --> R{What changed?}

    R -->|"Hotel change karo"| HA["Hotel Agent\n+ Optimizer"]
    R -->|"Doosri flight dikhao"| FA["Travel Agent Flights\n+ Optimizer"]
    R -->|"Train options dikhao"| TA["Travel Agent Trains\n+ Optimizer"]
    R -->|"Budget ₹45k kar do"| OA["Optimizer only"]
    R -->|"Kuch aur activity"| AA["Activity Agent\n+ Optimizer"]
    R -->|"Sab kuch badlo"| ALL["All Agents\n+ Estimator\n+ Optimizer"]

    style HA fill:#10B981,color:#fff
    style FA fill:#3B82F6,color:#fff
    style TA fill:#6366F1,color:#fff
    style OA fill:#8B5CF6,color:#fff
    style AA fill:#F59E0B,color:#fff
    style ALL fill:#EF4444,color:#fff
```

---

## ✨ Features

### Feature 1 — 🎙️ Voice-First Input & Output

Bhashini ASR converts spoken Hindi, Hinglish, Tamil, Telugu, Bengali, Marathi, or English into text. The agent replies via Bhashini TTS in the same language. Web Speech API is the silent fallback.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#6366F1', 'primaryTextColor': '#fff', 'lineColor': '#94A3B8'}}}%%
sequenceDiagram
    participant U as 🎙️ User
    participant VS as voiceService.js
    participant B as Bhashini ASR
    participant O as Orchestrator
    participant T as Bhashini TTS

    U->>VS: Tap mic → speak
    VS->>B: Stream audio (POST /ulca/api/v0/model/compute)
    B-->>VS: Transcript + language tag
    VS->>O: Raw Hinglish transcript (no normalisation)
    O-->>VS: Reply text
    VS->>T: Reply text → audio
    T-->>U: Spoken reply in user's language
```

**Error handling:** Mic denied → friendly prompt. No speech → "Kuch suna nahi — dobara bolein?". Bhashini unreachable → silent fallback to Web Speech. All voice logic isolated in `src/services/voiceService.js`.

---

### Feature 2 — 💬 Multilingual Hinglish NLU

Gemini 2.0 Flash parses free-form, code-mixed queries into structured JSON intents. "Hotel change karo, budget thoda zyada kar" → `{ intent: "CHANGE_HOTEL", budget_delta: "increase" }`.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#1E293B', 'primaryTextColor': '#F1F5F9', 'lineColor': '#6366F1'}}}%%
graph TD
    Q["Raw query:\n'Mujhe Goa ke liye flight chahiye next Friday'"] --> G["Gemini 2.0 Flash\nJSON Mode"]
    G --> I["Intent: START_PLANNING\nsource: Delhi\ndestination: Goa\ndate: next Friday\ntravellers: 1\nbudget: null → ask"]

    subgraph ACTIONS ["Action Vocabulary"]
        A1["START_PLANNING"]
        A2["RECOMMEND_DESTINATIONS"]
        A3["SEARCH_COMPONENTS"]
        A4["CHANGE_HOTEL / CHANGE_TRAVEL / CHANGE_ACTIVITY"]
        A5["UPDATE_BUDGET / REPLAN_ALL"]
        A6["CONFIRM_BOOKING"]
        A7["ASK_KNOWLEDGE → RAG Layer"]
        A8["GET_WEATHER → Open-Meteo"]
        A9["GET_ITINERARY → Itinerary Generator"]
    end

    style G fill:#6366F1,color:#fff
```

---

### Feature 3 — 📚 RAG Knowledge Layer

Grounds destination Q&A in a real corpus — not hallucination. ~65 chunks (month-by-month suitability, entry fees, packing, etiquette, pitfalls) embedded with `paraphrase-multilingual-MiniLM-L12-v2`. Cosine search returns top-3 chunks injected into the Gemini prompt.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#3B82F6', 'primaryTextColor': '#fff', 'lineColor': '#94A3B8'}}}%%
flowchart LR
    Q["User: 'October mein\nSpiti jaana theek hai?'"] --> E["HuggingFace\nEmbedding API"]
    E --> CS["Cosine Search\n65 chunks × 384 dims\nIn-memory flat index"]
    CS --> TOP["Top 3 chunks\nretrieved"]
    TOP --> GM["Gemini Prompt\n+ Context Injection"]
    GM --> ANS["Grounded Answer\n'Based on seasonal data...'"]

    CS -->|Miss| TAV["Tavily Web Search\nLive fallback"]
    TAV --> GM

    style E fill:#3B82F6,color:#fff
    style CS fill:#6366F1,color:#fff
    style TAV fill:#F59E0B,color:#fff
```

---

### Feature 4 — 🗺️ Destination Recommendation Agent

Hybrid scorer across ~65 destinations with a **novelty bonus** — at least 20% of every slate is a lesser-known destination (Ziro Valley, Mawlynnong, Chand Baori, Tawang).

```
score(destination) =
  0.4 × interest_match
+ 0.3 × season_fit
+ 0.2 × budget_fit
+ 0.1 × novelty_bonus
```

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#8B5CF6', 'primaryTextColor': '#fff', 'lineColor': '#94A3B8'}}}%%
graph LR
    U["User interests\n+ budget + month"] --> SC["Hybrid Scorer"]
    SC --> FILTER["Filter feasible\ndestinations"]
    FILTER --> SLATE["Slate: 3–6 destinations\n≥ 20% long-tail guaranteed"]
    SLATE --> EXP["Explainability:\n'Because you like trekking\nand October is peak for\nArunachal Pradesh'"]

    style SC fill:#8B5CF6,color:#fff
    style SLATE fill:#6366F1,color:#fff
```

No live API call at this stage — runs entirely on static metadata in the backend.

---

### Feature 5 — ✈️🚂 Travel Agent (Flights + Trains, Parallel)

Searches flights and trains as genuine alternatives under the same budget.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#1E293B', 'primaryTextColor': '#F1F5F9', 'lineColor': '#3B82F6'}}}%%
graph TD
    D["Destination locked"] --> TA["Travel Agent"]

    TA --> FL["✈️ Flight Search\nAviationstack API\ndep_iata → arr_iata\ncarrier · duration · stops · price"]
    TA --> TR["🚂 Train Search\nIndian Rail API (RapidAPI)\nRajdhani · Shatabdi · Express\n3A/2A/SL classes · INR price"]

    FL --> C1["Candidate T1:\nIndiGo DEL→GOI\n₹6,200 · 2h20m · Direct"]
    TR --> C2["Candidate T2:\nGoa Express 10103\nNDLS→MAO · 3A · ₹1,450 · Overnight"]

    C1 --> OPT["Budget Optimizer\n— picks across both —"]
    C2 --> OPT

    style FL fill:#3B82F6,color:#fff
    style TR fill:#10B981,color:#fff
    style OPT fill:#6366F1,color:#fff
```

Each candidate carries `source_reference` + `expires_at` — stale candidates are excluded at booking time.

---

### Feature 6 — 🏨 Hotel Agent

Returns 5 candidates across budget tiers for any supported destination.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#F59E0B', 'primaryTextColor': '#fff', 'lineColor': '#94A3B8'}}}%%
flowchart LR
    LOC["Destination\nlat/lon"] --> OTM["OpenTripMap API\nradius=5000m\nkinds=accomodations\n10k calls/day free"]
    LOC --> OSM["OSM Overpass API\ntourism=hotel\nFallback when < 3 results"]

    OTM --> TIER["Price Tier Assignment\nfrom category + destination profile"]
    OSM --> TIER

    TIER --> OUT["5 Candidates:\n1 budget · 2 standard · 2 premium\nname · rating · price_total_inr · cancellation"]

    style OTM fill:#F59E0B,color:#fff
    style OSM fill:#94A3B8,color:#fff
    style OUT fill:#10B981,color:#fff
```

---

### Feature 7 — 🧗 Activity Agent (Season-Aware)

Static catalog of ~120 curated Indian experiences. Filtered by region, month, difficulty, price, and user interests.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#10B981', 'primaryTextColor': '#fff', 'lineColor': '#94A3B8'}}}%%
graph TD
    MONTH["Travel month\n+ user interests\n+ remaining budget"] --> FILTER

    subgraph FILTER ["Filtering Logic"]
        F1["region match"]
        F2["season_months includes travel month"]
        F3["price × travellers ≤ remaining budget"]
        F4["category ∩ user interests"]
    end

    FILTER --> CATALOG["~120 Activity Catalog\nRishikesh Rafting · Bir-Billing Paragliding\nKedarkantha Trek · Rann Utsav\nZiro Music Festival · Hampi Bouldering\nDzukou Valley Trek · Havelock Scuba..."]
    CATALOG --> FEATURED["Featured Rotation\nchanges automatically by month"]

    style FILTER fill:#10B981,color:#fff
    style FEATURED fill:#6366F1,color:#fff
```

---

### Feature 8 — 💸 Trip Expense Estimator

Estimates food + local transport per destination, clearly labeled as estimates — never guaranteed costs.

| Destination | Food/day | Local Transport/day | Profile |
|---|---|---|---|
| Goa | ₹800 | ₹400 | standard |
| Ladakh | ₹600 | ₹600 | standard |
| Kerala | ₹500 | ₹300 | standard |
| Rajasthan | ₹400 | ₹250 | budget |
| Spiti | ₹450 | ₹500 | budget |
| Andaman | ₹700 | ₹350 | standard |

Output always shows `~₹7,000 estimated for food (standard profile) — not charged by us`.

---

### Feature 9 — ⚖️ Budget Optimizer

Combines all candidates under one total budget. Ranks 3–5 feasible combinations with distinct plan labels. Two soft scoring signals added:

- **Sustainability score (0–1):** Low-footfall + low-fragility destinations score higher.
- **Crowd score (0–1):** Off-peak month preference.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#8B5CF6', 'primaryTextColor': '#fff', 'lineColor': '#94A3B8'}}}%%
graph LR
    IN["Travel candidates T1…Tn\nHotel candidates H1…Hn\nActivities A1…An\nExpense estimates"] --> OPT["Budget Optimizer\n1 shared wallet\nEnumerate feasible combos"]

    OPT --> P1["🏆 Best Value\nLowest total, all constraints met"]
    OPT --> P2["⭐ Best Experience\nHighest hotel rating + activity match"]
    OPT --> P3["🌿 Sustainable Choice\nLow footfall · eco-friendly"]
    OPT --> P4["🗺️ Offbeat Pick\n≥ 1 long-tail destination activity"]
    OPT --> P5["🚀 Better Travel\nShortest flight / best train class"]

    style OPT fill:#8B5CF6,color:#fff
```

---

### Feature 10 — 📅 Day-by-Day Itinerary Generator

After plan selection, Gemini generates a real time-slotted itinerary — not just "Plan B: T2 + H3 + A3".

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#6366F1', 'primaryTextColor': '#fff', 'lineColor': '#94A3B8'}}}%%
sequenceDiagram
    participant U as User
    participant O as Orchestrator
    participant G as Gemini 2.0 Flash
    participant DB as Supabase

    U->>O: "Plan B select karo"
    O->>G: Locked travel + hotel + activities + RAG context + trip params
    G-->>O: Structured JSON — day-by-day slots
    O->>DB: Store itinerary
    O-->>U: Day-by-day timeline UI (< 10 seconds)

    U->>O: "Day 3 mein kuch aur add karo"
    O->>G: Only Day 3 context
    G-->>O: Updated Day 3 slots only
    O-->>U: Day 3 updated (rest unchanged)
```

Each day slot: `time · type (travel/checkin/explore/food) · description · estimated_spend_today_inr`.

---

### Feature 11 — 🌤️ Weather Tool

Real-time 7-day forecasts via Open-Meteo (free, no API key). Used both for direct user queries and passively by the Destination Agent to validate static season tags.

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=10.05&longitude=77.06
  &daily=precipitation_sum,temperature_2m_max,temperature_2m_min
  &timezone=Asia/Kolkata&forecast_days=7
```

Gemini summarises the raw data into plain language:
> *"Munnar ke liye agle hafte mein halki baarish ki sambhavana hai — raincoat saath rakhein."*

---

### Feature 12 — 💾 Trip Memory (Cross-Session)

On every new session, the Orchestrator injects the last 3 trip summaries + preference profile as a system prompt prefix (< 500 tokens). In-progress trips resume without re-explaining.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#3B82F6', 'primaryTextColor': '#fff', 'lineColor': '#94A3B8'}}}%%
sequenceDiagram
    participant U as User (new session)
    participant O as Orchestrator
    participant SB as Supabase

    U->>O: Login (Clerk user ID)
    O->>SB: Query user_trip_memory (last 3 trips + preference profile)
    SB-->>O: "Rajasthan Oct 2025, ₹35k, heritage+food. Coorg Feb 2026, nature."
    O->>O: Inject as system prompt prefix
    U->>O: "Mujhe ek trip plan karo"
    O-->>U: Recommendations already filtered by known preferences
```

---

### Feature 13 — 💳 Booking Service

Revalidates price and availability before any payment. Shows changes > ₹200 to the user for re-confirmation.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#10B981', 'primaryTextColor': '#fff', 'lineColor': '#94A3B8'}}}%%
flowchart TD
    SEL["User confirms plan"] --> RV1["Re-query flight/train API\nwith source_reference"]
    RV1 --> RV2["Re-query hotel API\nfor current availability"]

    RV2 --> CHK{Price changed\n> ₹200 or sold out?}

    CHK -->|Yes| PAUSE["Pause. Show updated total.\nRequire re-confirmation."]
    PAUSE -->|User re-confirms| PAY
    PAUSE -->|User declines| RE["Re-offer optimizer\nwith fresh candidates"]

    CHK -->|No| PAY["Razorpay Checkout\nor UPI QR for IRCTC trains"]
    PAY --> CONF["Write to bookings table\nStore confirmation reference\nActivate Post-Booking Companion"]

    style PAY fill:#10B981,color:#fff
    style PAUSE fill:#F59E0B,color:#fff
    style RE fill:#6366F1,color:#fff
```

---

### Feature 14 — 🔄 Replan Logic

Surgical reruns — never full recompute on a partial change.

| User says | What reruns |
|---|---|
| "Hotel change karo" | Hotel Agent → Optimizer |
| "Doosri flight dikhao" | Travel Agent (flights only) → Optimizer |
| "Train options dikhao" | Travel Agent (trains only) → Optimizer |
| "Budget ₹45k kar do" | Optimizer only |
| "Kuch aur activity add karo" | Activity Agent → Optimizer |
| "Sab kuch badlo" | All Agents → Estimator → Optimizer |

Old candidates are marked `superseded_at` — never deleted. Full history preserved.

---

### Feature 15 — 🎒 Post-Booking Companion

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#F59E0B', 'primaryTextColor': '#fff', 'lineColor': '#94A3B8'}}}%%
graph TD
    BOOK["Booking confirmed"] --> PC["Post-Booking Companion"]

    PC --> CL["15a. Smart Packing Checklist\nGemini → destination + season + trip type + duration\nStored in trip_checklists (Supabase)\nUser checks items off in UI"]
    PC --> DV["15b. Document Vault\nBooking PDFs auto-saved to Cloudinary\nManual upload: visa · ID · travel insurance\n'Mera booking confirmation dikhao' — works"]
    PC --> FT["15c. Live Flight Tracker\nOpenSky Network API (free, no key)\nFlight status: on-time · delayed · landed\nBrowser push notification on status change"]

    style CL fill:#10B981,color:#fff
    style DV fill:#3B82F6,color:#fff
    style FT fill:#8B5CF6,color:#fff
```

---

## 🆓 Free API Stack

All APIs are confirmed free-tier. No paid contracts.

| Need | Service | Free Tier | Notes |
|---|---|---|---|
| LLM / Agents | **Google Gemini 2.0 Flash** | Generous free tier | All agent reasoning |
| LLM fallback | **Groq (Llama 3.x)** | Free, very fast | Cheap tool-calling loops |
| Flight search | **Aviationstack** | 500 calls/mo | Routes, schedules, carriers |
| Flight fallback | **OpenSky Network** | Free, no key | Live aircraft + route confirmation |
| Trains | **Indian Rail API (RapidAPI)** | Free tier | PNR, trains between stations |
| Hotels | **OpenTripMap** | 10k calls/day free | POI + stay data |
| Hotels fallback | **OSM Overpass API** | Free, no key | Accommodation POIs |
| Maps / routing | **OSM + OSRM + Nominatim** | Free, no key | Already integrated |
| Geocoding | **Photon** | Free, no key | Already integrated |
| Weather | **Open-Meteo** | Free, no key | 7-day forecast |
| Voice STT | **Bhashini ASR** | Free (Govt. of India) | 22 Indian languages |
| Voice STT fallback | **Web Speech API** | Free, in-browser | Zero-dependency fallback |
| Voice TTS | **Bhashini TTS** | Free | Same service |
| Voice TTS fallback | **Web speechSynthesis** | Free, in-browser | Browser-native |
| Embeddings | **HuggingFace Inference API** | Free tier | Multilingual sentence-transformers |
| Web search | **Tavily** | 1,000 calls/mo free | RAG fallback for live data |
| Media | **Cloudinary** | Free tier | Document vault PDFs |
| Database | **Supabase** | Free tier | PostgreSQL + Realtime + Storage |
| Auth | **Clerk** | Free tier | User sessions |
| Frontend | **Vercel** | Free tier | Auto-deploy from GitHub |
| Backend | **Render** | Free tier | FastAPI agent backend |

---

## 🗄️ Database Schema

```sql
-- Users (Clerk ID as primary key)
CREATE TABLE users (
  id text PRIMARY KEY,
  preference_profile jsonb,
  created_at timestamptz DEFAULT now()
);

-- Core trip record
CREATE TABLE trips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text REFERENCES users(id),
  source text, destination text,
  travel_date date, days int, travellers int,
  total_budget_inr int,
  status text DEFAULT 'planning', -- planning|review|selected_for_booking|booked
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Extracted trip requirements from conversation
CREATE TABLE trip_requirements (
  trip_id uuid REFERENCES trips(id),
  interests text[],
  constraints jsonb,
  spending_style text, -- budget|standard|premium
  raw_conversation_summary text
);

-- All curated candidates (flights, trains, hotels, activities)
CREATE TABLE trip_candidates (
  id text PRIMARY KEY, -- T1, T2, H1, A1 etc.
  trip_id uuid REFERENCES trips(id),
  type text, -- FLIGHT|TRAIN|HOTEL|ACTIVITY
  provider text,
  provider_reference text,
  data_json jsonb,
  price_inr int,
  expires_at timestamptz,
  superseded_at timestamptz -- set on replan, never deleted
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

-- Ranked optimizer output
CREATE TABLE trip_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid REFERENCES trips(id),
  travel_candidate_id text,
  hotel_candidate_id text,
  activity_candidate_ids text[],
  estimated_total_inr int,
  label text, -- Best Value|Best Experience|Sustainable Choice|Offbeat Pick|Better Travel
  sustainability_score float,
  created_at timestamptz DEFAULT now()
);

-- User's plan selection
CREATE TABLE selected_plans (
  trip_id uuid REFERENCES trips(id),
  plan_id uuid REFERENCES trip_plans(id),
  selected_at timestamptz DEFAULT now()
);

-- Post-payment bookings
CREATE TABLE bookings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid REFERENCES trips(id),
  component_type text,
  provider text,
  provider_reference text,
  final_price_inr int,
  status text,
  confirmation_reference text,
  document_url text -- Cloudinary URL
);

-- Cross-session trip memory
CREATE TABLE user_trip_memory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text REFERENCES users(id),
  trip_summary jsonb,
  preference_profile jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Post-booking packing checklists
CREATE TABLE trip_checklists (
  trip_id uuid REFERENCES trips(id),
  items jsonb, -- [{item, category, checked}]
  generated_at timestamptz DEFAULT now()
);
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- Python 3.10+
- A Supabase project
- A Clerk account
- API keys: Google Gemini, Aviationstack, OpenTripMap, HuggingFace, Tavily, Cloudinary, Bhashini

### Installation

```bash
# 1. Clone
git clone https://github.com/divyanshux-tech/agent-repo.git
cd agent-repo

# 2. Backend
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# → Fill in your API keys
uvicorn main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Environment Variables (Backend `.env`)

```env
GEMINI_API_KEY=
GROQ_API_KEY=
AVIATIONSTACK_API_KEY=
OPENTRIPMAP_API_KEY=
RAPIDAPI_KEY=               # Indian Rail API
HUGGINGFACE_API_KEY=
TAVILY_API_KEY=
CLOUDINARY_URL=
BHASHINI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
CLERK_SECRET_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

> ⚠️ **Security:** All third-party API calls are proxied through the Render backend. No API key is ever exposed in the client bundle.

---

## 📂 Repository Structure

```
agent-repo/
├── backend/
│   ├── main.py                    # FastAPI entry point, SSE streaming
│   ├── agents/
│   │   ├── orchestrator.py        # Intent parsing, state machine, memory inject
│   │   ├── destination_agent.py   # Hybrid scorer, novelty bonus
│   │   ├── travel_agent.py        # Flights (Aviationstack) + Trains (Indian Rail)
│   │   ├── hotel_agent.py         # OpenTripMap + OSM Overpass
│   │   ├── activity_agent.py      # Static catalog, season filter
│   │   ├── expense_estimator.py   # Food + local transport profiles
│   │   ├── budget_optimizer.py    # Enumeration, sustainability scoring
│   │   ├── itinerary_generator.py # Day-by-day via Gemini
│   │   └── booking_service.py     # Revalidate → Razorpay → confirm
│   ├── services/
│   │   ├── rag_service.py         # HuggingFace embeddings, cosine search, Tavily fallback
│   │   ├── weather_service.py     # Open-Meteo integration
│   │   ├── memory_service.py      # Supabase trip memory read/write
│   │   └── companion_service.py   # Checklist, document vault, flight tracker
│   ├── data/
│   │   ├── destinations.json      # ~65 destination metadata entries
│   │   ├── activities.json        # ~120 activity catalog entries
│   │   └── cost_profiles.json     # Food + transport estimates per destination
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── services/
│   │   │   └── voiceService.js    # listen() · speak() · detectLanguage() · cancel()
│   │   ├── hooks/
│   │   │   └── useSSE.js          # Real-time SSE streaming from backend
│   │   ├── components/
│   │   │   ├── ChatComposer.jsx   # Mic button, waveform, text input
│   │   │   ├── FlightCard.jsx     # Interactive flight candidate card
│   │   │   ├── TrainCard.jsx      # Interactive train candidate card
│   │   │   ├── HotelCard.jsx      # Interactive hotel candidate card
│   │   │   ├── ActivityCard.jsx   # Activity candidate card
│   │   │   ├── PlanCard.jsx       # Ranked plan card (Best Value, etc.)
│   │   │   ├── ItineraryTimeline.jsx  # Day-by-day trip view
│   │   │   ├── PackingChecklist.jsx   # Post-booking checklist
│   │   │   ├── DocumentVault.jsx      # PDF upload + Cloudinary display
│   │   │   └── FlightTracker.jsx      # Live OpenSky status
│   │   └── App.jsx
│   └── package.json
│
└── scripts/
    ├── seed_destinations.py       # Populate destination metadata
    ├── seed_activities.py         # Populate activity catalog
    └── embed_knowledge_base.py    # Embed RAG corpus → vectors JSON
```

---

## 🏗️ Build Order

Build strictly in this sequence — each phase is testable before the next begins:

| Phase | What to build | Test signal |
|---|---|---|
| 1 | Supabase schema + Render FastAPI skeleton | Schema migrations applied, `/health` live |
| 2 | Orchestrator + Hinglish NLU (text only) | 10 test queries parse correctly |
| 3 | Destination metadata + scoring function | Shortlist in < 200ms, explains each pick |
| 4 | Travel Agent — trains (Indian Rail API) | Train candidates for Delhi→Goa |
| 5 | Travel Agent — flights (Aviationstack) | Flight candidates for same route |
| 6 | Hotel Agent (OpenTripMap + OSM) | 5 candidates across 2 price tiers |
| 7 | Activity Agent (static catalog) | Season-filtered activities for October Kerala |
| 8 | Expense Estimator | Cost profiles for 10 destinations |
| 9 | Budget Optimizer | 3 ranked plans for a test trip |
| 10 | RAG knowledge layer | "Is October good for Spiti?" answered correctly |
| 11 | Itinerary Generator | Day-by-day plan from selected plan in < 10s |
| 12 | Weather Tool | Hindi weather summary for any Indian city |
| 13 | Voice input (Bhashini ASR + Web Speech fallback) | Hindi query processed end-to-end |
| 14 | Voice output (Bhashini TTS) | Reply spoken back in user's language |
| 15 | Trip Memory (Supabase) | Second session resumes without re-explaining |
| 16 | Booking Service (Razorpay + revalidation) | Test booking completes with confirmation |
| 17 | Post-booking companion (checklist + tracker) | Checklist generated, flight status shown |
| 18 | Replan logic | "Change hotel" does not re-call flight API |
| 19 | Polish, error states, demo rehearsal | All acceptance criteria pass |

---

## 🌍 Real Problems This Solves

| Problem | How Nura fixes it |
|---|---|
| **Language barrier in digital travel** | Most platforms are English-only. Nura works in Hindi, Hinglish, Tamil, Telugu, Bengali, Marathi — entirely by voice. |
| **Price opacity + hidden costs** | Shared-wallet model with transparent "booked vs estimated" breakdown. No ₹5k flight becoming a ₹40k trip surprise. |
| **Overtourism at popular sites** | ≥20% of every recommendation slate is a lesser-known destination. Sustainable Choice plan actively routes demand away from Goa/Jaipur. |
| **Train vs flight blind spot** | Indian trains carry 8 billion passengers/year. No major travel AI treats them as genuine alternatives. Nura does. |
| **Cold-start uselessness** | Content + seasonality scorer makes useful first recommendations without any prior user data. |
| **Post-booking abandonment** | Packing checklist, document vault, and live flight tracker extend the agent's value through the trip itself. |

---

## ✅ Full Acceptance Criteria

- [ ] `"मुझे अक्टूबर में पाँच दिन केरल जाना है ₹30,000 में"` → real day-by-day itinerary, train + hotel + activities, spoken back in Hindi
- [ ] `"Goa trip plan karo, 4 din, 2 log, 25k budget"` parses correctly → 3 ranked plans
- [ ] Train options shown for Delhi–Goa, Delhi–Jaipur, Mumbai–Goa
- [ ] Weather query answered in plain Hindi with packing advice (jacket / umbrella / sunscreen)
- [ ] "Hotel change karo" does not re-call the flight API
- [ ] ≥ 1 of every 5 destination recommendations is a lesser-known destination
- [ ] Every recommendation includes a plain-language explanation
- [ ] Voice input works in Chrome via Bhashini; falls back to Web Speech elsewhere
- [ ] Bhashini unreachable → silent fallback, no error shown to user
- [ ] Booking revalidates price before charging; price change > ₹200 shown to user
- [ ] Second session resumes trip without re-explaining from scratch
- [ ] No API key exposed in the client bundle — all third-party calls proxied via Render backend
- [ ] Packing checklist generated within 5 seconds of booking confirmation
- [ ] Itinerary generated within 10 seconds of plan selection

---

## 📦 Deployment

| Layer | Service | Notes |
|---|---|---|
| Frontend | **Vercel** | Free tier, auto-deploy from GitHub |
| Agent backend | **Render** | Free tier — spins down after 15min inactivity, ~30s cold start (acceptable for demo) |
| Database | **Supabase** | PostgreSQL + Realtime + Storage |
| Media / PDFs | **Cloudinary** | Document vault |
| Auth | **Clerk** | User sessions |

---

<div align="center">

**Built for academic demonstration.**
All APIs are confirmed free-tier. No paid contracts.

*Built by Dhruv and divyanshu · B.Tech CSE 2023–2027*

</div>