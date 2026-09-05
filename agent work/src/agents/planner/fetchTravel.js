// ============================================================
// src/agents/planner/fetchTravel.js
// Travel fetch function — Phase 4 (SerpAPI Google Flights Integration)
//
// Responsibility: Query live flight search engine (or fallback),
// apply user constraint filtering (e.g. non_stop_only), return
// curated candidate list, and persist candidates to DB.
// ============================================================

const { prisma } = require('../../db/client');
const { searchGoogleFlights } = require('./serpApiClient');

/**
 * Fetches and filters travel (flight/bus/train) candidates
 * from the live provider API.
 *
 * @param {object} tripContext
 * @param {string} tripContext.tripId
 * @param {string} tripContext.source        e.g. "Delhi" / "DEL"
 * @param {string} tripContext.destination   e.g. "Goa" / "GOI"
 * @param {string} tripContext.travelDate    ISO date string
 * @param {number} tripContext.travellers
 * @param {object} [tripContext.constraints] e.g. { non_stop_only: true }
 * @returns {Promise<object[]>} Curated travel candidates saved in trip_candidates DB table
 */
async function fetchTravel(tripContext) {
  const {
    tripId,
    source,
    destination,
    travelDate,
    travellers = 1,
    constraints = {},
  } = tripContext;

  console.log(`[PlannerAgent.fetchTravel] Searching live flights: ${source} → ${destination} on ${travelDate || 'default'} (×${travellers})`);

  // Fetch flight options via SerpAPI client (or fallback simulator)
  const rawCandidates = await searchGoogleFlights({
    source,
    destination,
    travelDate,
    travellers,
  });

  // Apply constraint filtering (e.g., non-stop only)
  let filtered = rawCandidates;
  if (constraints.non_stop_only) {
    filtered = rawCandidates.filter(c => (c.metadataJson?.stops ?? 0) === 0);
    // If filter removed all options, keep original candidates to avoid zero plans
    if (filtered.length === 0) filtered = rawCandidates;
  }

  // Set 30-minute price expiration window
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  // If tripId is provided, persist to trip_candidates DB table
  if (tripId) {
    // Mark existing active TRAVEL candidates for this trip as superseded
    await prisma.tripCandidate.updateMany({
      where: { tripId, type: 'TRAVEL', superseded: false },
      data: { superseded: true },
    });

    const savedCandidates = await Promise.all(
      filtered.map((c) =>
        prisma.tripCandidate.create({
          data: {
            tripId,
            type: 'TRAVEL',
            alias: c.alias,
            provider: c.provider,
            providerReference: c.providerReference,
            price: c.price,
            currency: c.currency || 'INR',
            metadataJson: c.metadataJson,
            expiresAt,
            superseded: false,
          },
        })
      )
    );

    console.log(`[PlannerAgent.fetchTravel] Persisted ${savedCandidates.length} travel candidates to DB.`);
    return savedCandidates;
  }

  return filtered;
}

module.exports = fetchTravel;
