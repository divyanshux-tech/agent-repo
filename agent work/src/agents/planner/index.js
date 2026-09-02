// ============================================================
// src/agents/planner/index.js
// Planner Agent — Phase 4 entry point
//
// Architecture:
//   PlannerAgent.run(tripContext, estimates)
//     ├── [parallel] fetchTravel(tripContext)  → travel candidates
//     ├── [parallel] fetchHotel(tripContext)   → hotel candidates
//     └── [after both] optimise(travel, hotel, estimates, budget)
//                                              → ranked feasible plans
// ============================================================

const fetchTravel = require('./fetchTravel');
const fetchHotel  = require('./fetchHotel');
const optimise    = require('./optimise');
const { prisma }  = require('../../db/client');

/**
 * PlannerAgent.run()
 *
 * Runs fetchTravel and fetchHotel in parallel, then calls optimise().
 * Never pre-allocates sub-budgets per category.
 *
 * @param {object} tripContext - Structured trip requirements from the Orchestrator
 * @param {object} [estimates] - Non-booked cost estimates from the Trip Expense Estimator
 * @returns {Promise<object[]>} Ranked feasible plans
 */
async function run(tripContext, estimates = {}) {
  const totalBudget = tripContext.totalBudget || tripContext.total_budget;

  // Run both fetch functions in parallel
  const [travelCandidates, hotelCandidates] = await Promise.all([
    fetchTravel(tripContext),
    fetchHotel(tripContext),
  ]);

  // After both resolve, run the optimisation
  const plans = await optimise(
    travelCandidates,
    hotelCandidates,
    estimates,
    totalBudget,
    tripContext.tripId
  );

  return plans;
}

/**
 * Re-runs only hotel fetching & optimisation while re-using existing active travel candidates.
 * (Minimal-recompute rule)
 */
async function recomputeHotelOnly(tripContext, estimates = {}) {
  const totalBudget = tripContext.totalBudget || tripContext.total_budget;
  const tripId = tripContext.tripId;

  // Retrieve existing active TRAVEL candidates for this trip
  let travelCandidates = [];
  if (tripId) {
    travelCandidates = await prisma.tripCandidate.findMany({
      where: {
        tripId,
        type: 'TRAVEL',
        superseded: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });
  }

  // Fall back to fetchTravel if no active travel candidates exist
  if (!travelCandidates || travelCandidates.length === 0) {
    travelCandidates = await fetchTravel(tripContext);
  }

  // Fetch updated hotel candidates
  const hotelCandidates = await fetchHotel(tripContext);

  // Run optimisation
  return await optimise(
    travelCandidates,
    hotelCandidates,
    estimates,
    totalBudget,
    tripId
  );
}

module.exports = {
  run,
  recomputeHotelOnly,
  fetchTravel,
  fetchHotel,
  optimise,
};
