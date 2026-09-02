# Plan Through Us — Implementation Plan
### Hinglish Travel Planning Platform — Full Technical Implementation Guide

**Core principle:** One shared wallet, not separate category budgets. Live APIs provide options → specialist agents interpret/filter them → the planner combines them → the user chooses → only then does booking happen.

**Golden rule:** A live trip session is temporary/working state (T1, T2, H1, H2...). It is *not* an ML dataset. Permanent data (users, trips, provider references, estimates, bookings, audit/history) lives in the durable database.

---

## 0. Architecture Overview

```
User → Orchestrator Agent → Destination Agent → Planner Agent
     │                                              ├── [parallel] fetchTravel()
     │                                              ├── [parallel] fetchHotel()
     │                                              └── optimise() → Plans [A, B, C]
     → Trip Expense Estimator (feeds into optimise)
     → User selects plan → Booking Service (revalidate) → Payment → Confirmation
```

**Five responsibilities — never mix them:**

| Component | Responsibility | Must NOT do |
|---|---|---|
| Orchestrator Agent | Talk to user, maintain trip state, route requests | Book anything, optimize budget |
| Destination Recommendation Agent | Shortlist destinations | Query every travel/hotel API for every destination |
| Planner Agent | Run `fetchTravel()`, `fetchHotel()` in parallel; run `optimise()` to rank feasible combinations | Pre-assign per-category sub-budgets; book anything |
| &nbsp;&nbsp;↳ `fetchTravel()` | Call travel provider API, filter candidates within constraints | Decide budget allocation |
| &nbsp;&nbsp;↳ `fetchHotel()` | Call hotel provider API, filter candidates within constraints | Decide budget allocation |
| &nbsp;&nbsp;↳ `optimise()` | Combine travel + hotel results into ranked feasible plans | Run before both fetch functions complete |
| Trip Expense Estimator | Estimate food/local transport/incidental costs | Present estimates as guaranteed costs |
| Booking Service | Book only after user selects a plan | Run before plan selection |

---

## Phase 1 — Foundations & Data Layer

**Goal:** Stand up the durable schema and storage strategy before any agent logic is built.

### 1.1 Requirements
- PostgreSQL (or equivalent transactional DB) for durable data.
- Redis (or similar cache) for short-lived planning-session state and raw API snapshots — optional for MVP if PostgreSQL alone is used with an `expires_at`/`status` field.
- Object storage (S3-compatible) for large raw API payload archives, if retained beyond debugging needs.
- A clear **retention policy** for raw API snapshots (e.g., purge after N days or after booking completes).

### 1.2 Database Tables to Create
| Table | Key Columns | Purpose |
|---|---|---|
| `users` | id, profile/preferences (jsonb), created_at | Durable user identity |
| `trips` | id, user_id, source, destination, travel_date, days, travellers, total_budget, status, created_at, updated_at | Core trip record |
| `trip_requirements` | trip_id, interests (array/jsonb), constraints, spending_style, conversation-derived fields | Structured requirements from chat |
| `trip_candidates` | id, trip_id, type (TRAVEL/HOTEL/ACTIVITY), provider, provider_reference, price, currency, start/end times, metadata_json, expires_at | Curated candidate storage (T1/H1/A1 etc.) |
| `trip_cost_estimates` | trip_id, food_estimate, local_transport_estimate, other_estimate, method, source, confidence, created_at | Non-booked expense estimates |
| `trip_plans` | id, trip_id, travel_candidate_id, hotel_candidate_id, activity_candidate_ids, estimated_total, score, label, created_at | Generated plans (Plan A/B/C) |
| `selected_plans` | trip_id, plan_id, selected_at | User's chosen plan |
| `bookings` | id, trip_id, component_type, provider, provider_reference, final_price, currency, status, confirmation_reference | Booking/payment records |
| `api_search_logs` | trip_id, provider, request_metadata, response_reference, timestamp, status | Debug/audit trail |
| `destination_cost_profiles` | destination, food_baseline, transport_baseline, profile_level, updated_at | Admin-maintained estimator input |

### 1.3 Explicit Anti-Patterns
- ❌ Do **not** create per-user dataset files (`user_1_dataset.csv`).
- ❌ Do **not** treat T1/T2/H1/H2 as anything other than local candidate IDs scoped to one trip session.
- ❌ Do **not** build an ML training pipeline at this stage — that belongs to a later, separate analytics/data-warehouse phase.

### 1.4 Acceptance Criteria
- [ ] Schema migrations applied and versioned (e.g., via Prisma/Knex/Alembic/Flyway).
- [ ] A trip record can be created, updated, and marked `expired`/`completed`.
- [ ] Redis (if used) has TTL configured on session keys.

---

## Phase 2 — Conversation / Orchestrator Agent

**Goal:** Build the chat interface and the routing brain that owns trip state.

### 2.1 Requirements
- LLM-backed intent parser that maps free-form chat (including Hinglish, e.g. "hotel change karo") into structured `intent` + `trip_requirements` updates.
- Defined action vocabulary: `RECOMMEND_DESTINATIONS`, `SEARCH_COMPONENTS`, `CHANGE_HOTEL`, `CHANGE_TRAVEL`, `CHANGE_ACTIVITY`, `UPDATE_BUDGET`, `REPLAN_ALL`, `CONFIRM_BOOKING`.
- State machine tracking trip `status`: `planning → review → selected_for_booking → booked`.
- Minimal-recompute rule: only call the specialist agent(s) actually affected by the user's request (e.g., "change hotel" → only Hotel Agent + Optimizer rerun, not Travel Agent).

### 2.2 Input / Output Contract
**Input:** chat message(s) + current trip state (from `trips`/`trip_requirements`).

**Output (example):**
```json
{
  "intent": "START_PLANNING",
  "trip_requirements": {
    "source": "Delhi",
    "days": 5,
    "travellers": 2,
    "travel_date": "2026-10-15",
    "total_budget": 40000,
    "destination_preference": null,
    "interests": ["beaches", "food", "nightlife"]
  }
}
```

### 2.3 Key Behaviors to Implement
- Hinglish/mixed-language intent detection (transliteration-tolerant NLU).
- Slot-filling: ask follow-up questions only for missing required fields (source, dates/days, travellers, budget).
- Idempotent state updates — re-sending the same message shouldn't duplicate trip records.
- Guardrail: Orchestrator never calls the Booking Service directly except via `CONFIRM_BOOKING` after explicit user plan selection.

### 2.4 Acceptance Criteria
- [ ] Orchestrator correctly extracts structured requirements from at least 10 varied Hinglish/English test phrasings.
- [ ] "Change X" requests trigger only the relevant specialist agent, not a full replan.
- [ ] Trip state persists across messages/sessions (resumable).

---

## Phase 3 — Destination Recommendation Agent

**Goal:** Narrow thousands of destinations to a small shortlist *before* any expensive live API calls happen.

### 3.1 Requirements
- A destination metadata store (tags: beach/hill/heritage/nightlife/etc., typical cost tier, seasonality) — can start as a curated static table for MVP.
- Ranking logic using: source, travel dates, days, travellers, total budget, interests, constraints.
- Output limited to a small shortlist (e.g., 3–6 destinations).

### 3.2 Input / Output Contract
**Input:**
```json
{
  "source": "Delhi",
  "days": 5,
  "travellers": 2,
  "travel_date": "2026-10-15",
  "total_budget": 40000,
  "interests": ["beaches", "food", "nightlife"]
}
```
**Output (example):** Goa, Gokarna, Pondicherry, Kerala, Andaman.

### 3.3 Key Behaviors
- Must **not** trigger Travel/Hotel/Activity API calls for every candidate destination — that happens only after the user picks one.
- Once selected, destination becomes the trip's locked `destination` field.
- Support a "change destination" replan path that resets downstream candidates.

### 3.4 Acceptance Criteria
- [ ] Shortlist generation completes without calling any live travel/hotel provider.
- [ ] Selecting a destination updates `trips.destination` and transitions status appropriately.

---

## Phase 4 — Planner Agent (Travel + Hotel + Optimise)

**Goal:** Once destination is locked, a single **Planner Agent** runs two data-fetch functions concurrently and then one optimisation function to produce ranked, feasible trip plans.

**Key design decision:** Two focused internal functions (`fetchTravel` and `fetchHotel`) run in parallel. After both resolve, `optimise()` enumerates all travel × hotel combinations against the one shared budget and produces ranked plans.

```
PlannerAgent.run(tripContext)
  ├── [parallel] fetchTravel(tripContext)  → travel candidates [T1, T2, T3…]
  ├── [parallel] fetchHotel(tripContext)   → hotel candidates  [H1, H2, H3…]
  └── [after both] optimise(travel, hotel, estimates, budget)
                                           → ranked feasible plans [Plan A, B, C]
```

---

### 4.1 `fetchTravel(tripContext)` — Travel Function

**Responsibility:** Call the travel provider API and return curated flight/transport candidates that fit the trip's route, dates, passenger count, and user constraints.

**Requirements:**
- Integration with at least one flight/travel provider API (MVP: one provider is enough).
- Filtering logic: correct route/dates/passenger count, remove unavailable or constraint-violating options (e.g., `non_stop_only`).
- Return top N curated candidates, each retaining the full original payload plus a `source_reference` for auditability.
- Persist each candidate to `trip_candidates` (type = `TRAVEL`) with `expires_at`.

**Output (example):**
```json
[
  {
    "id": "T1",
    "provider": "ExampleAir",
    "from": "DEL",
    "to": "GOI",
    "departure": "2026-10-15T10:00",
    "arrival": "2026-10-15T12:30",
    "duration_minutes": 150,
    "stops": 0,
    "price": 8000,
    "currency": "INR",
    "baggage": "15kg",
    "source_reference": "PROVIDER_RESULT_abc"
  },
  { "id": "T2", "price": 9500, "stops": 0, "source_reference": "PROVIDER_RESULT_def" },
  { "id": "T3", "price": 12000, "stops": 1, "source_reference": "PROVIDER_RESULT_ghi" }
]
```
**Critical rule:** `T1.price = ₹8,000` is the actual provider price returned from the API — not an invented budget allocation.

---

### 4.2 `fetchHotel(tripContext)` — Hotel Function

**Responsibility:** Call the hotel provider API and return curated hotel candidates that match the destination, dates, guest count, and user constraints.

**Requirements:**
- Integration with at least one hotel provider API.
- Evaluate availability, dates, guest count, price, location, rating, amenities, cancellation policy.
- Return candidates spanning different price/quality tiers (budget → luxury).
- Persist each candidate to `trip_candidates` (type = `HOTEL`) with `expires_at`.

**Output (example):**
```json
[
  {
    "id": "H1",
    "provider": "ExampleHotelAPI",
    "hotel_name": "Budget Stay",
    "check_in": "2026-10-15",
    "check_out": "2026-10-20",
    "rooms": 1,
    "guests": 2,
    "price_total": 6000,
    "currency": "INR",
    "rating": 3.8,
    "cancellation": "Free cancellation until 2026-10-12",
    "source_reference": "HOTEL_RESULT_uvw"
  },
  { "id": "H2", "hotel_name": "Beachside Hotel", "price_total": 8000, "rating": 4.3, "source_reference": "HOTEL_RESULT_xyz" },
  { "id": "H3", "hotel_name": "Premium Resort", "price_total": 10000, "rating": 4.7, "source_reference": "HOTEL_RESULT_pqr" }
]
```

---

### 4.3 `optimise(travel, hotel, estimates, totalBudget)` — Optimisation Function

**Responsibility:** After both fetch functions return, enumerate feasible combinations of (travel × hotel) against the single total budget and produce ranked plans.

**When it runs:** Only after `fetchTravel` and `fetchHotel` have both resolved (`Promise.all`).

**Feasibility rule:** `travel.price + hotel.price_total + estimates.non_booked_cost ≤ total_budget`

**No sub-budget pre-assignment:** The function sees all candidates together and filters by total feasibility — it never pre-splits the budget into per-category envelopes.

**Ranking objectives (3 implemented):**
| Label | Objective |
|---|---|
| Best Value | Lowest total estimated cost |
| Better Hotel | Highest hotel rating within budget |
| Better Travel | Fewest stops / fastest travel within budget |

**Output:** 3–5 ranked feasible plans persisted to `trip_plans`.

```json
[
  { "id": "PLAN_A", "label": "Best Value",    "travel": "T1", "hotel": "H2", "estimated_total": 29000 },
  { "id": "PLAN_B", "label": "Better Hotel",  "travel": "T2", "hotel": "H3", "estimated_total": 33500 },
  { "id": "PLAN_C", "label": "Better Travel", "travel": "T3", "hotel": "H3", "estimated_total": 36000 }
]
```

---

### 4.4 Cross-Cutting Requirements
- `fetchTravel` and `fetchHotel` **run in parallel** (`Promise.all([fetchTravel, fetchHotel])`) to minimise latency.
- `optimise()` is called only **after both** fetch calls resolve — it must not run on partial data.
- Both fetch functions persist candidates to `trip_candidates` with `type`, `provider_reference`, and `expires_at`.
- **Never hard-allocate a fixed sub-budget per category** inside any function.
- On replan (e.g., "change hotel"): only `fetchHotel()` + `optimise()` re-run; `fetchTravel()` is skipped unless its inputs changed.

### 4.5 Acceptance Criteria
- [ ] `fetchTravel` and `fetchHotel` execute concurrently and the combined wall-clock time is < 5s for MVP.
- [ ] `optimise()` is never called before both fetch functions resolve.
- [ ] Each candidate is traceable back to its raw provider response via `source_reference`.
- [ ] Candidates persist correctly to `trip_candidates` with expiry timestamps.
- [ ] `optimise()` produces at least 3 distinct ranking objectives (Best Value, Better Hotel, Better Travel).
- [ ] Replan of hotel only re-invokes `fetchHotel()` + `optimise()`, not `fetchTravel()`.

---

## Phase 5 — Trip Expense Estimator (Food + Local Transport)

**Goal:** Produce transparent, labeled *estimates* for costs that aren't booked through the platform's inventory.

### 5.1 Requirements
- Destination/city cost-profile table (`destination_cost_profiles`) for MVP-supported destinations.
- Estimation method must be explicit and stored: `estimation_method`, `profile_level` (e.g., budget/standard/luxury), `confidence`.
- All outputs must be clearly labeled as **estimates**, never presented as guaranteed or mandatory costs.

### 5.2 Output Contract
```json
{
  "trip_id": "TRIP_123",
  "food_estimate": 7000,
  "local_transport_estimate": 5000,
  "other_estimate": 0,
  "estimation_method": "destination_profile",
  "profile_level": "standard",
  "currency": "INR"
}
```

### 5.3 Roadmap Beyond MVP
- Itinerary-based routing for more accurate local transport estimates.
- Real local transport pricing feeds.
- Historical platform spending data.
- User-selected spending style (budget/standard/luxury) as an input multiplier.

### 5.4 Acceptance Criteria
- [ ] Estimator returns a value for every supported destination with a documented method/source.
- [ ] UI clearly labels these figures as "estimated," not fixed costs.

---

## Phase 6 — Budget Optimizer / Planner

**Goal:** Combine Travel + Hotel + Activity + estimated non-booked expenses against the single total budget and rank feasible plans.

### 6.1 Requirements
- Feasibility rule: `travel + hotel + activities + estimated_non_booked_cost ≤ total_budget`.
- No pre-assigned per-category sub-budgets — optimizer sees all candidates together.
- MVP approach: simple enumeration over candidate sets (e.g., 5 travel × 5 hotel × 5 activity = 125 combinations is trivial to enumerate).
- Post-MVP: formal optimization solver (e.g., constraint programming / ILP) for larger search spaces.
- Explicit, product-defined ranking objectives (e.g., "Best Value," "Better Hotel," "Better Travel") — feasibility is objective-independent; ranking is not.

### 6.2 Input Contract (example)
```json
{
  "travel_options": [{"id": "T1", "price": 8000}, {"id": "T2", "price": 9500}, {"id": "T3", "price": 12000}],
  "hotel_options": [{"id": "H1", "price": 6000}, {"id": "H2", "price": 8000}, {"id": "H3", "price": 10000}],
  "activity_options": [{"id": "A1", "price": 2000}, {"id": "A2", "price": 3000}, {"id": "A3", "price": 4000}],
  "estimated_non_booked_cost": 12000,
  "total_budget": 40000
}
```

### 6.3 Worked Example
| Combination | Calculation | Total | Feasible? |
|---|---|---|---|
| T1+H2+A1+12K | 8K+8K+2K+12K | ₹30,000 | ✅ |
| T2+H3+A3+12K | 9.5K+10K+4K+12K | ₹35,500 | ✅ |
| T3+H3+A3+12K | 12K+10K+4K+12K | ₹38,000 | ✅ |
| T3+H3+A3+18K (higher estimate) | 12K+10K+4K+18K | ₹44,000 | ❌ |

### 6.4 Output — Plans Shown to User
| Plan | Travel | Hotel | Activity | Food (est.) | Local Transport (est.) | Total | Positioning |
|---|---|---|---|---|---|---|---|
| A | T1 ₹8K | H2 ₹8K | A1 ₹2K | ₹7K | ₹5K | ₹30K | Best Value |
| B | T2 ₹9.5K | H3 ₹10K | A3 ₹4K | ₹7K | ₹5K | ₹35.5K | Better Hotel |
| C | T3 ₹12K | H3 ₹10K | A3 ₹4K | ₹7K | ₹5K | ₹38K | Better Travel |

Present **3–5 feasible plans**; nothing is booked at this stage.

### 6.5 Acceptance Criteria
- [ ] Optimizer correctly filters infeasible combinations.
- [ ] At least two distinct ranking objectives implemented (e.g., cheapest total, best-rated hotel within budget).
- [ ] Output plans persist to `trip_plans` with a stable `label` and `estimated_total`.

---

## Phase 7 — Plan Presentation & Selection UI

**Goal:** Let the user compare and select one plan; nothing is booked until this step completes.

### 7.1 Requirements
- Card/table UI showing each plan's breakdown (travel/hotel/activity/food/transport/total) and positioning label.
- Clear visual distinction between "booked-through-us" costs and "estimated" costs.
- Selection writes to `selected_plans` and updates `trips.status = review → selected_for_booking`.

### 7.2 Output Contract on Selection
```json
{
  "selected_plan_id": "PLAN_B",
  "trip_id": "TRIP_123",
  "travel_id": "T2",
  "hotel_id": "H3",
  "activity_ids": ["A3"],
  "status": "selected_for_booking"
}
```

### 7.3 Acceptance Criteria
- [ ] User can select exactly one plan; selection is recorded and immutable until replan.
- [ ] UI never implies a booking has occurred before this step.

---

## Phase 8 — Booking Service / Booking Agent

**Goal:** Only starts after plan selection. Prices/availability can drift between search and purchase, so revalidation is mandatory.

### 8.1 Requirements
- Live revalidation of price and availability for the selected travel + hotel + activity candidates.
- If the revalidated total differs from the displayed total, show the updated total to the user **before** payment.
- Payment gateway integration (e.g., Razorpay/Stripe) with proper PCI-compliant handling (never store raw card data).
- Booking confirmation flow that writes to `bookings` with `provider_reference` and `confirmation_reference`.

### 8.2 Sequence
1. Revalidate live price.
2. Revalidate availability.
3. Show any changed total to the user.
4. Obtain payment/confirmation.
5. Create booking records.
6. Return confirmation references to the user.

### 8.3 Acceptance Criteria
- [ ] Booking never proceeds silently on a stale price — user must acknowledge changes.
- [ ] Failure at any step (e.g., hotel sold out) triggers a graceful fallback (re-offer optimizer with updated candidates), not a broken booking.
- [ ] Bookings table records final price, status, and provider confirmation reference.

---

## Phase 9 — Change / Replan Logic

**Goal:** Support incremental edits without wasteful full recomputation.

| User says | Flow |
|---|---|
| "Change hotel" | Orchestrator → Hotel Agent → new hotel candidates → replace in trip state → Optimizer → new plans |
| "Change travel" | Orchestrator → Travel Agent → new candidates → Optimizer → new plans |
| "Change activity" | Orchestrator → Activity Agent → new candidates → Optimizer → new plans |
| "Make it cheaper" | Orchestrator adjusts optimization objective/constraint → Optimizer reranks or requests cheaper candidates |
| "Budget is ₹45K" | Update `trips.total_budget` → Optimizer reruns only; no full rebuild unless requirements changed |
| "Change everything" | Orchestrator → rerun relevant specialist agents → Estimator → Optimizer |

### 9.1 Acceptance Criteria
- [ ] Each replan trigger only recomputes the minimum necessary components.
- [ ] Trip state history is preserved (old candidates not silently deleted, but superseded) for audit purposes.

---

## Phase 10 — MVP Build Order (Actual Sequencing)

Build strictly in this order to keep each phase testable in isolation:

1. PostgreSQL schema: `users`, `trips`, `trip_candidates`, `trip_cost_estimates`, `trip_plans`, `bookings`.
2. "Plan Through Us" chat UI + structured trip state (Orchestrator skeleton).
3. Destination shortlist logic for a limited, supported destination set.
4. Build the **Planner Agent** scaffold with the four internal functions: `fetchTravel()`, `fetchHotel()`, `fetchActivities()`, `optimise()`.
5. Implement `fetchTravel()` — integrate one travel provider API + filtering logic.
6. Implement `fetchHotel()` — integrate one hotel provider API + filtering logic.
7. Implement `fetchActivities()` — small internal activity catalog (no live API required yet).
8. Destination cost-profile table for food/local transport estimates.
9. Implement `optimise()` — simple enumeration-based combination optimizer.
10. Wire `Promise.all([fetchTravel, fetchHotel, fetchActivities])` then call `optimise()`; show 3–5 feasible plans.
11. Add change/replan commands (partial re-invoke: e.g., hotel change → only `fetchHotel()` + `optimise()`).
12. Implement booking/revalidation — only after selection.
13. **Later:** itinerary-based transport estimation, more providers, more destinations, solver-based optimization, analytics/ML pipeline.

---

## Phase 11 — Storage Policy Summary

| Data | Where | When Written | Why |
|---|---|---|---|
| User profile/preferences | PostgreSQL | Account creation/updates | Durable user data |
| Trip requirements | PostgreSQL | Planning start | Recover/resume trip |
| Current trip session | Redis or PostgreSQL | During planning | Fast current state |
| Raw API response snapshot | Redis/object storage or short-lived DB table | During search | Debug/revalidation; apply retention policy |
| Curated T1/T2/H1 candidates | Trip candidate tables / session cache | During planning | Stable candidate IDs for optimizer/UI |
| Destination cost profiles | PostgreSQL | Admin/data update | Reusable estimation data |
| Generated plans | PostgreSQL | When optimizer finishes | User review/selection |
| Selected plan | PostgreSQL | On user selection | Booking input |
| Booking/payment records | PostgreSQL | After booking begins | Permanent transactional record |
| ML training dataset | Separate analytics/data warehouse | Later, if ML introduced | Training/analytics — **not required for MVP** |

---

## Phase 12 — The One Mental Model (Keep This Visible to the Whole Team)

- **API** = inventory/data source.
- **Agent** = specialist that knows how to search, filter and interpret that inventory.
- **Trip Session** = temporary/current data for one planning session.
- **Cost Estimator** = estimates non-booked expenses.
- **Optimizer** = combines all categories under the one total budget.
- **Orchestrator** = controls conversation and which step/agent runs.
- **Booking** = happens only after the user selects a plan.

**Flow:** user requirements → destination → live candidates → estimated extra expenses → feasible plans → user selection → booking → END.

---

## Appendix A — Example Full Runtime State (Reference)

```json
{
  "trip_id": "TRIP_123",
  "requirements": {
    "source": "Delhi",
    "destination": "Goa",
    "date": "2026-10-15",
    "days": 5,
    "travellers": 2,
    "budget": 40000
  },
  "travel_candidates": [
    {"id": "T1", "price": 8000, "stops": 0},
    {"id": "T2", "price": 9500, "stops": 0},
    {"id": "T3", "price": 12000, "stops": 0}
  ],
  "hotel_candidates": [
    {"id": "H1", "price": 6000},
    {"id": "H2", "price": 8000},
    {"id": "H3", "price": 10000}
  ],
  "activity_candidates": [
    {"id": "A1", "price": 2000},
    {"id": "A2", "price": 3000},
    {"id": "A3", "price": 4000}
  ],
  "estimated_expenses": {"food": 7000, "local_transport": 5000},
  "plans": [
    {"id": "PLAN_A", "total": 30000},
    {"id": "PLAN_B", "total": 35500},
    {"id": "PLAN_C", "total": 38000}
  ],
  "selected_plan": null,
  "status": "review"
}
```

This object is **runtime state for one active trip session** — not a training dataset.

---

## Appendix B — Non-Functional Requirements Checklist

- [ ] **Latency:** Parallel specialist agent calls kept under an agreed SLA (e.g., 5–8s for MVP).
- [ ] **Idempotency:** Re-running the same replan command doesn't duplicate candidates or plans.
- [ ] **Data expiry:** All price-bearing candidates carry an `expires_at`; stale candidates are excluded before booking.
- [ ] **Auditability:** Every booking traceable to the exact candidate + raw provider response used.
- [ ] **Language support:** Hinglish/mixed-language intent parsing tested against real user phrasing samples.
- [ ] **Graceful degradation:** If a live API fails, fall back to cached/catalog data (esp. for Activity Agent) rather than blocking the whole flow.
- [ ] **Security:** No card/payment data stored directly; PCI-compliant gateway used for Phase 8.
- [ ] **Separation of concerns:** Code review checklist enforces the "six responsibilities" table in Phase 0 — no agent should absorb another agent's job.
