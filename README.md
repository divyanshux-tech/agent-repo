<!-- Project overview and setup instructions -->
# TASKS.md — Plan Through Us
## Current Sprint & Build Queue

> This file is your Antigravity session agenda.
> Complete tasks in order. Mark done with ✅. Never skip ahead.
> One Antigravity session = one task.

---

## Phase 0 — Foundation ✅ DONE
- [x] Folder structure created
- [x] All MD documentation files written
- [x] Empty placeholder files in place

---

## Phase 1 — Tailwind & Design Tokens (START HERE)

- [ ] **TASK 1.1** — Write `frontend/tailwind.config.js`
  Copy all colour tokens, font families, border-radius values, box-shadows, 
  animation keyframes from DESIGN_SYSTEM.md Section 11 exactly.
  Test: run `npm run dev`, confirm Tailwind classes resolve.

- [ ] **TASK 1.2** — Write `frontend/src/index.css`
  Import Google Fonts: Playfair Display (400,600,700), Inter (400,500,600,700),
  JetBrains Mono (400,500), Noto Sans Devanagari (400,500).
  Set CSS custom properties for all colour tokens.
  Set global body font to Inter, color to stone-900.
  Reset: box-sizing border-box, no default margins.

- [ ] **TASK 1.3** — Write `frontend/src/components/ui/Button.jsx`
  All variants: primary, secondary, ghost, danger.
  All sizes: sm, md, lg.
  Loading state with spinner.
  See DESIGN_SYSTEM.md section 7 for exact specs.

- [ ] **TASK 1.4** — Write `frontend/src/components/ui/` primitives
  Input.jsx, Badge.jsx, Skeleton.jsx (shimmer animation), Toast.jsx, Modal.jsx.
  All using Tailwind tokens from tailwind.config.js.

---

## Phase 2 — Layout Shell

- [ ] **TASK 2.1** — Write `frontend/src/components/layout/Navbar.jsx`
  Logo: "Plan Through" Inter 600 stone-900 + "Us" primary-500 + orange dot.
  Nav links centered on desktop. Auth buttons right.
  Mobile hamburger → slide drawer.
  See DESIGN_SYSTEM.md section 7.1.

- [ ] **TASK 2.2** — Write `frontend/src/components/layout/Footer.jsx`
  Simple 3-column. No heavy design.

- [ ] **TASK 2.3** — Write `frontend/src/App.jsx`
  React Router v6 setup. All routes registered. Clerk auth wrapper.
  Protected routes: /booking, /trip, /profile.

---

## Phase 3 — Hero Section (Most Important UI)

- [ ] **TASK 3.1** — Write `frontend/src/components/agent/AgentInput.jsx`
  The hero search bar. See DESIGN_SYSTEM.md section 7.3 for full spec.
  Static first — no API calls. Just the UI.
  LanguagePill left side. TextInput center. VoiceButton + SubmitButton right.
  On focus: border turns orange, card shadow grows.

- [ ] **TASK 3.2** — Write `frontend/src/components/agent/PromptChips.jsx`
  4 prompt chip pills below the input.
  Content: "✈️ Plan 5 days in Kerala ₹30k", "🚂 Trains Delhi → Goa Friday",
           "🏔️ Offbeat October destination", "🌤️ Best time to visit Ladakh"
  On click: fills AgentInput with the chip text.

- [ ] **TASK 3.3** — Write the 3D hero element
  File: `frontend/src/components/hero/HeroVisual.jsx`
  Option: Stacked card composition using Framer Motion (3 cards: FlightCard,
  HotelCard, ItineraryDay card, slightly rotated, fanned like a hand of cards).
  Alternative: React Three Fiber low-poly India map (warm orange material).
  Must have: pointer-events none, reduced-motion safe, < 2MB.

- [ ] **TASK 3.4** — Assemble `frontend/src/pages/HomePage.jsx`
  HeroSection: left 50% (eyebrow + headline + subheading + AgentInput + PromptChips)
              right 50% (HeroVisual)
  Background: gradient primary-50 → white.
  Headline in Playfair Display 700 56px stone-900.
  See DESIGN_SYSTEM.md section 7.2.

---

## Phase 4 — Static Result Components

- [ ] **TASK 4.1** — Write `frontend/src/components/results/FlightCard.jsx`
  Boarding pass style. IATA codes in JetBrains Mono 28px.
  Route line with dashed style + plane icon. Price in JetBrains Mono 22px.
  See DESIGN_SYSTEM.md section 7.5 for full spec.
  Test with hardcoded mock data.

- [ ] **TASK 4.2** — Write `frontend/src/components/results/TrainCard.jsx`
  Same layout as FlightCard. Train number visible. Class picker tabs (SL/3A/2A/1A).
  Sky-500 accent instead of orange. See DESIGN_SYSTEM.md section 7.6.

- [ ] **TASK 4.3** — Write `frontend/src/components/results/HotelCard.jsx`
  Image left + details right layout. Rating stars. Price total prominent.
  See DESIGN_SYSTEM.md section 7.7.

- [ ] **TASK 4.4** — Write `frontend/src/components/results/PlanCard.jsx`
  The optimizer output card. Label badge + travel/hotel/activity summary.
  BudgetBreakdown with booked vs estimated split.
  Selected state: orange border, scale 1.01.
  See DESIGN_SYSTEM.md section 7.8.

- [ ] **TASK 4.5** — Write `frontend/src/components/destinations/DestinationCard.jsx`
  CheapFlights-style. Image top, destination + price bottom.
  Optional recommended badge (absolute positioned, top-right).
  See DESIGN_SYSTEM.md section 7.10.

---

## Phase 5 — Agent Chat UI

- [ ] **TASK 5.1** — Write `frontend/src/components/agent/MessageBubble.jsx`
  UserBubble: right-aligned, primary-500 bg, white text, 18px 18px 4px 18px radius.
  AgentBubble: left-aligned, white card, stone-200 border, small AI avatar.
  See DESIGN_SYSTEM.md section 7.9.

- [ ] **TASK 5.2** — Write `frontend/src/components/agent/ToolStep.jsx`
  Left-bordered status message. running / done / error states with icons.
  Slides down with animation on appearance.
  Examples: "🔍 Searching trains..." / "✓ Found 8 trains"

- [ ] **TASK 5.3** — Write `frontend/src/components/agent/AgentChat.jsx`
  Conversation thread. Auto-scrolls on new message.
  Handles message types: user | assistant | tool_step | plans | flights | trains | hotels.
  When type is 'plans': renders PlanCards inline in chat.
  Loading: TypingIndicator (3 dots pulsing in sequence, stone-400 colour).

---

## Phase 6 — Pages (All With Mock Data)

- [ ] **TASK 6.1** — `frontend/src/pages/ResultsPage.jsx`
  3-5 PlanCards side by side (desktop), stacked (mobile).
  Select button navigates to /itinerary/:tripId.
  Mock data: 3 hardcoded plans.

- [ ] **TASK 6.2** — `frontend/src/pages/ItineraryPage.jsx`
  Day tabs at top. DayTimeline for each day.
  Right sidebar: budget tracker + "Book this trip" CTA.
  Mock data: 5-day Kerala itinerary.

- [ ] **TASK 6.3** — `frontend/src/pages/BookingPage.jsx`
  Price revalidation notice banner (visible if price changed).
  Razorpay checkout button (static for now).

- [ ] **TASK 6.4** — `frontend/src/pages/TripPage.jsx`
  3 tabs: Itinerary | Documents | Flight Tracker.
  Documents: upload button (static for now).
  Checklist: list of checkable items.

---

## Phase 7 — Zustand Stores & React Query

- [ ] **TASK 7.1** — Write all three Zustand stores
  tripStore.js, agentStore.js, userStore.js.
  See FRONTEND.md for full store shapes.

- [ ] **TASK 7.2** — Write all custom hooks
  useAgent.js, useVoice.js, useTrip.js.

---

## Phase 8 — Backend (Start After Phase 7)

- [ ] **TASK 8.1** — `backend/main.py` skeleton + /health endpoint
  Deploy to Render. Confirm cold start < 40s.

- [ ] **TASK 8.2** — All Pydantic models
  candidate.py, trip.py, plan.py, chat.py.

- [ ] **TASK 8.3** — Supabase schema
  Apply db/migrations/001_initial_schema.sql.
  Test: insert a trip record, read it back.

- [ ] **TASK 8.4** — Each router returns mock data
  /chat, /flights/search, /trains/search, /hotels/search all return hardcoded JSON.
  Wire frontend services to these. Confirm data renders in UI.

- [ ] **TASK 8.5** — `backend/services/weather_service.py`
  Open-Meteo integration. No key needed.
  Test: GET /weather?destination=Goa returns 7-day forecast.

- [ ] **TASK 8.6** — `backend/agents/travel_agent.py` — trains
  Indian Rail API via RapidAPI. Test Delhi → Goa.

- [ ] **TASK 8.7** — `backend/agents/travel_agent.py` — flights
  Aviationstack. Test DEL → GOI.

- [ ] **TASK 8.8** — `backend/agents/hotel_agent.py`
  OpenTripMap + OSM fallback. Test Goa.

- [ ] **TASK 8.9** — `backend/agents/activity_agent.py`
  Static catalog from activities.json. Season filter test: October Kerala.

- [ ] **TASK 8.10** — `backend/services/estimator_service.py`
  Cost profiles for 10 destinations first.

- [ ] **TASK 8.11** — `backend/agents/budget_optimizer.py`
  Enumeration. Test: 3 flights × 3 hotels × 3 activities → ranked plans.

---

## Phase 9 — Agent Intelligence

- [ ] **TASK 9.1** — `backend/agents/orchestrator.py`
  Gemini 2.0 Flash intent parsing. Test 10 Hinglish inputs (see PROMPTS.md section 7).

- [ ] **TASK 9.2** — Run embed_knowledge.py script
  Generate embeddings for all knowledge_chunks.json entries.
  Verify knowledge_embeddings.json created.

- [ ] **TASK 9.3** — `backend/services/rag_service.py`
  Cosine search + Tavily fallback.
  Test: "Is October good for Spiti?" → grounded answer.

- [ ] **TASK 9.4** — `backend/services/itinerary_service.py`
  Gemini day-by-day generator using PROMPTS.md section 3.
  Test: 5-day Goa plan → structured JSON itinerary.

- [ ] **TASK 9.5** — Streaming /chat endpoint
  Wire all agents together. Stream tool_step events.
  Test full flow: Hinglish query → intent → search → plans → itinerary.

---

## Phase 10 — Voice

- [ ] **TASK 10.1** — `frontend/src/services/voiceService.js`
  Web Speech API first (listen() and speak() working in Chrome).
  Test: say "Plan trip to Goa" → transcript appears → agent responds.

- [ ] **TASK 10.2** — Bhashini ASR integration
  Replace Web Speech primary with Bhashini.
  Test Hindi: "मुझे केरल जाना है" → correct transcript.

- [ ] **TASK 10.3** — Bhashini TTS integration
  Agent reply spoken in detected language.
  Speaker toggle in localStorage.

- [ ] **TASK 10.4** — `frontend/src/components/agent/VoiceButton.jsx`
  Full animated state: idle / recording (pulse + waveform) / processing / error.

---

## Phase 11 — Persistence & Booking

- [ ] **TASK 11.1** — `frontend/src/services/tripService.js`
  Supabase integration. Save and load trip state.
  Test: refresh page → trip state restored.

- [ ] **TASK 11.2** — `backend/services/memory_service.py`
  Write session summary to user_trip_memory.
  Inject on session start: past trips appear in Orchestrator context.

- [ ] **TASK 11.3** — `backend/routers/bookings.py`
  Revalidation: re-call flight/train API with source_reference.
  Price change detection: flag if > ₹200 difference.
  Razorpay payment intent creation.

- [ ] **TASK 11.4** — `frontend/src/pages/BookingPage.jsx` wired
  Show real revalidated price. Razorpay checkout functional.

---

## Phase 12 — Polish & Demo Prep

- [ ] **TASK 12.1** — Mobile responsiveness pass
  Every page tested at 375px, 768px, 1280px.
  No horizontal scroll. No broken layouts.

- [ ] **TASK 12.2** — Loading skeleton pass
  Every component that fetches data shows Skeleton while loading.
  No raw spinners for content areas.

- [ ] **TASK 12.3** — Error state pass
  Every API call has a graceful error state with a retry option.
  Bhashini unavailable → Web Speech fallback (silent to user).
  Backend cold start → show "Waking up the agent..." message.

- [ ] **TASK 12.4** — Demo flow end-to-end test
  Voice query in Hindi → plans → select plan → itinerary → booking flow.
  Record the demo. Check for any visual glitches.

- [ ] **TASK 12.5** — Performance check
  Lighthouse score > 80 on mobile.
  Backend Render cold start: send /health ping from frontend on load.
  3D hero element: < 2MB, falls back to static if Three.js fails.

---

## Antigravity Session Template

Start every session with this:

```
We are building "Plan Through Us" — an AI travel agent for India.

Before writing any code:
1. Read DESIGN_SYSTEM.md — follow ALL colour, typography, and motion rules
2. Read FRONTEND.md (if frontend task) or BACKEND.md (if backend task)
3. Read the specific component or section relevant to this task

Current task: [paste the task from TASKS.md]

Rules for this session:
- Use only Tailwind classes defined in tailwind.config.js
- Use Lucide React for all icons (stroke-width 1.5)
- Use JetBrains Mono for all prices and codes
- Use Playfair Display only for hero-level headlines
- No cold grey colours — use warm stone palette only
- No ambient animations — motion only on user actions or state changes
```