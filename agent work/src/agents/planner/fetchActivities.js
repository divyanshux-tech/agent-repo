// ============================================================
// src/agents/planner/fetchActivities.js
// Activity fetch function — Phase 4
//
// Responsibility: Fetch/curate activity options matching
// destination, dates, interests, and price constraints.
// MVP uses an internal catalog; live API integration is optional.
//
// SCAFFOLD — to be fully implemented in Phase 4.
// Activities are OPTIONAL — the optimise() function must
// handle zero-activity plans gracefully.
// ============================================================

const { prisma } = require('../../db/client');

// ── Internal activity catalog (MVP fallback) ─────────────────
// Keyed by destination (lowercase). Replace/supplement with
// live API calls in Phase 4.
const ACTIVITY_CATALOG = {
  goa: [
    { name: 'North Goa Sightseeing',   price: 2000, durationHours: 6, interests: ['sightseeing', 'beaches', 'food'] },
    { name: 'Dudhsagar Falls Trip',     price: 3000, durationHours: 8, interests: ['nature', 'adventure', 'trekking'] },
    { name: 'Sunset Cruise + Dinner',   price: 4000, durationHours: 4, interests: ['food', 'nightlife', 'romantic'] },
    { name: 'Water Sports Package',     price: 2500, durationHours: 3, interests: ['adventure', 'beaches', 'sports'] },
  ],
  manali: [
    { name: 'Solang Valley Snow Play',  price: 1500, durationHours: 5, interests: ['adventure', 'snow', 'nature'] },
    { name: 'Rohtang Pass Day Trip',    price: 2500, durationHours: 8, interests: ['adventure', 'snow', 'sightseeing'] },
    { name: 'River Rafting',            price: 2000, durationHours: 3, interests: ['adventure', 'sports', 'water'] },
  ],
  kerala: [
    { name: 'Alleppey Houseboat Stay',  price: 5000, durationHours: 24, interests: ['nature', 'romantic', 'backwaters'] },
    { name: 'Munnar Tea Estate Tour',   price: 1500, durationHours: 6, interests: ['nature', 'sightseeing', 'photography'] },
    { name: 'Kathakali Performance',    price: 1000, durationHours: 2, interests: ['culture', 'art', 'heritage'] },
  ],
  andaman: [
    { name: 'Scuba Diving — Neil Island', price: 4000, durationHours: 4, interests: ['adventure', 'beaches', 'diving'] },
    { name: 'Radhanagar Beach Day',       price: 500,  durationHours: 5, interests: ['beaches', 'nature', 'relaxation'] },
    { name: 'Cellular Jail Light Show',   price: 300,  durationHours: 2, interests: ['heritage', 'history', 'culture'] },
  ],
  jaipur: [
    { name: 'Amber Fort + City Palace',  price: 1500, durationHours: 6, interests: ['heritage', 'history', 'sightseeing'] },
    { name: 'Hot Air Balloon Ride',      price: 8000, durationHours: 2, interests: ['adventure', 'luxury', 'photography'] },
    { name: 'Chokhi Dhani Dinner',       price: 2000, durationHours: 4, interests: ['food', 'culture', 'family'] },
  ],
};

/**
 * Simple interest-match score: fraction of activity's interests
 * that overlap with the user's interests.
 */
function interestMatch(activityInterests, userInterests) {
  if (!userInterests || userInterests.length === 0) return 0.5;
  const overlap = activityInterests.filter(i => userInterests.includes(i)).length;
  return overlap / activityInterests.length;
}

/**
 * Fetches activity options for the trip.
 * Uses internal catalog for MVP; extend with live API in Phase 4.
 *
 * @param {object} tripContext
 * @param {string} tripContext.tripId
 * @param {string} tripContext.destination
 * @param {string[]} tripContext.interests   e.g. ["beaches", "food"]
 * @param {number} tripContext.travellers
 * @returns {Promise<object[]>} Curated activity candidates (may be empty)
 */
async function fetchActivities(tripContext) {
  const {
    tripId,
    destination,
    interests = [],
    travellers,
  } = tripContext;

  const key = (destination || '').toLowerCase();
  const catalog = ACTIVITY_CATALOG[key] || [];

  if (catalog.length === 0) {
    console.log(`[PlannerAgent.fetchActivities] No catalog entries for "${destination}" — returning empty`);
    return [];
  }

  // Score and sort by interest match; take top 4
  const scored = catalog
    .map(a => ({ ...a, interestMatch: interestMatch(a.interests, interests) }))
    .sort((a, b) => b.interestMatch - a.interestMatch)
    .slice(0, 4);

  // Persist to trip_candidates (type = ACTIVITY)
  const aliases = ['A1', 'A2', 'A3', 'A4'];
  const saved = await Promise.all(
    scored.map((a, i) =>
      prisma.tripCandidate.create({
        data: {
          tripId,
          type: 'ACTIVITY',
          alias: aliases[i],
          provider: 'InternalCatalog',
          providerReference: `CATALOG_${key.toUpperCase()}_${i + 1}`,
          price: a.price * travellers, // scale to group price
          currency: 'INR',
          metadataJson: {
            activity: a.name,
            duration_hours: a.durationHours,
            price_per_person: a.price,
            interest_match: a.interestMatch,
            interests: a.interests,
          },
          expiresAt: null, // catalog items don't expire
        },
      })
    )
  );

  console.log(`[PlannerAgent.fetchActivities] trip ${tripId}: ${saved.length} activity candidates`);
  return saved;
}

module.exports = fetchActivities;
