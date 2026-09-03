// ============================================================
// src/agents/planner/optimise.js
// Optimisation function — Phase 4
//
// Responsibility: After fetchTravel() and fetchHotel() complete,
// enumerate feasible (travel × hotel) combinations against the
// ONE shared total budget and return ranked plans.
//
// Golden rules:
//   ✅ No pre-assigned per-category sub-budgets
//   ✅ Feasibility = travel + hotel + non_booked_cost ≤ total_budget
//   ✅ Returns multiple ranked plans — nothing is booked here
//   ✅ Called ONLY after Promise.all([fetchTravel, fetchHotel])
// ============================================================

const { prisma } = require('../../db/client');

// ── Ranking objectives ───────────────────────────────────────
const RANKING_OBJECTIVES = [
  {
    label: 'Best Value',
    // Lowest estimated total
    score: (combo) => -combo.estimatedTotal,
  },
  {
    label: 'Better Hotel',
    // Highest hotel rating, tie-break on lowest total
    score: (combo) => {
      const hotelRating = combo.hotel.metadataJson?.rating ?? 0;
      return hotelRating * 1000 - combo.estimatedTotal / 100000;
    },
  },
  {
    label: 'Better Travel',
    // Fewest stops, tie-break on lowest total
    score: (combo) => {
      const stops = combo.travel.metadataJson?.stops ?? 99;
      return -stops * 1000 - combo.estimatedTotal / 100000;
    },
  },
];

/**
 * optimise() — enumerate feasible travel × hotel combinations and return ranked plans.
 *
 * @param {object[]} travelCandidates  - From fetchTravel()
 * @param {object[]} hotelCandidates   - From fetchHotel()
 * @param {object}   estimates         - { foodEstimate, localTransportEstimate, otherEstimate }
 * @param {number}   totalBudget       - One shared wallet
 * @param {string}   tripId            - To persist plans to trip_plans table
 * @returns {Promise<object[]>} Ranked feasible plans (up to 3–5)
 */
async function optimise(travelCandidates, hotelCandidates, estimates, totalBudget, tripId) {
  const nonBookedCost =
    Number(estimates?.foodEstimate || 0) +
    Number(estimates?.localTransportEstimate || 0) +
    Number(estimates?.otherEstimate || 0);

  const budget = Number(totalBudget);

  // Enumerate all travel × hotel combinations
  const allCombos = [];
  for (const travel of travelCandidates) {
    for (const hotel of hotelCandidates) {
      const estimatedTotal = Number(travel.price) + Number(hotel.price) + nonBookedCost;

      if (estimatedTotal <= budget) {
        allCombos.push({ travel, hotel, estimatedTotal, nonBookedCostUsed: nonBookedCost });
      }
    }
  }

  if (allCombos.length === 0) {
    console.warn(
      `[optimise] No feasible combinations found for budget ₹${budget} ` +
      `(${travelCandidates.length} travel × ${hotelCandidates.length} hotel, non-booked: ₹${nonBookedCost})`
    );
    return [];
  }

  console.log(
    `[optimise] ${allCombos.length} feasible combinations ` +
    `(${travelCandidates.length}T × ${hotelCandidates.length}H)`
  );

  // Pick the best combo for each ranking objective — deduplicate
  const selected = [];
  const usedKeys = new Set();

  for (const objective of RANKING_OBJECTIVES) {
    const best = [...allCombos].sort((a, b) => objective.score(b) - objective.score(a))[0];
    const key  = `${best.travel.id}_${best.hotel.id}`;

    if (!usedKeys.has(key)) {
      usedKeys.add(key);
      selected.push({ ...best, label: objective.label });
    }

    if (selected.length >= 5) break; // Cap at 5 plans
  }

  // Persist to trip_plans
  if (tripId) {
    const savedPlans = await Promise.all(
      selected.map((plan) =>
        prisma.tripPlan.create({
          data: {
            tripId,
            travelCandidateId: plan.travel.id,
            hotelCandidateId:  plan.hotel.id,
            estimatedTotal:    plan.estimatedTotal,
            currency:          'INR',
            label:             plan.label,
            score:             null,
            nonBookedCostUsed: plan.nonBookedCostUsed,
          },
        })
      )
    );

    console.log(`[optimise] Persisted ${savedPlans.length} plans to trip_plans`);
    return savedPlans;
  }

  return selected;
}

module.exports = optimise;
