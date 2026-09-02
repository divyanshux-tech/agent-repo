# Plan Through Us — Hinglish Travel Planning Platform

## Overview
AI-powered multi-agent travel planning platform that supports Hinglish conversation, smart destination recommendations, and holistic budget optimization across a single shared wallet.

## Architecture
```
User → Orchestrator Agent → Destination Agent → Planner Agent
     │                                              ├── [parallel] fetchTravel()
     │                                              ├── [parallel] fetchHotel()
     │                                              ├── [parallel] fetchActivities()
     │                                              └── optimise() → Plans [A, B, C]
     → Trip Expense Estimator (feeds into optimise)
     → User selects → Booking Service (revalidate) → Payment → Confirmation
```

## Tech Stack
- **Backend:** Node.js (ESM), Prisma ORM
- **Database:** PostgreSQL (durable data)
- **Cache:** Redis (session state, optional for MVP)
- **AI/LLM:** OpenAI / Google Gemini / Anthropic Claude
- **Payments:** Razorpay (Phase 8)

## Project Structure
```
my-own-agent-work/
├── prisma/
│   ├── schema.prisma        # Prisma schema — single source of truth
│   └── migrations/          # Versioned migration files (auto-generated)
├── src/
│   ├── agents/              # Agent implementations
│   │   ├── orchestrator/    # Phase 2: Conversation + routing brain
│   │   ├── destination/     # Phase 3: Destination shortlist logic
│   │   └── planner/         # Phase 4: Single Planner Agent
│   │       ├── index.js     #   PlannerAgent.run() — Promise.all + optimise
│   │       ├── fetchTravel.js  #   Travel API fetch + filter function
│   │       ├── fetchHotel.js   #   Hotel API fetch + filter function
│   │       └── optimise.js  #   Enumeration optimizer (travel × hotel)
│   ├── estimator/           # Phase 5: Trip Expense Estimator
│   ├── booking/             # Phase 8: Booking Service
│   ├── db/                  # Database client & helpers
│   │   ├── client.js
│   │   ├── helpers.js
│   │   └── validate-phase1.js
│   └── utils/               # Shared utilities
├── seed/
│   └── destinations.js      # Seed data for destination_cost_profiles
├── .env.example             # Environment variable template
├── .gitignore
├── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (optional for MVP)

### Setup
```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 3. Run database migrations
npx prisma migrate dev --name init

# 4. Seed initial data
node seed/destinations.js

# 5. Generate Prisma client
npx prisma generate
```

## Phases
| Phase | Description | Status |
|---|---|---|
| 1 | Foundations & Data Layer | 🔄 In Progress |
| 2 | Orchestrator Agent | ⏳ Pending |
| 3 | Destination Recommendation Agent | ⏳ Pending |
| 4 | Travel, Hotel & Activity Agents | ⏳ Pending |
| 5 | Trip Expense Estimator | ⏳ Pending |
| 6 | Budget Optimizer / Planner | ⏳ Pending |
| 7 | Plan Presentation & Selection UI | ⏳ Pending |
| 8 | Booking Service | ⏳ Pending |
| 9 | Change / Replan Logic | ⏳ Pending |

## Key Rules
1. **One shared wallet** — never per-category sub-budgets.
2. **Six responsibilities** — each agent has a strict scope; see `implementation.md`.
3. **T1/T2/H1/H2** are session-scoped candidate IDs, not ML datasets.
4. **Booking happens last** — only after the user explicitly selects a plan.
