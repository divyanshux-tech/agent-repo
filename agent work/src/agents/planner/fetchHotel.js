// ============================================================
// src/agents/planner/fetchHotel.js
// Hotel fetch function — Phase 4 (SerpAPI Google Hotels Integration)
//
// Responsibility: Query live hotel search engine (or fallback),
// apply user constraint filtering (e.g. min_rating), return
// curated candidate list, and persist candidates to DB.
// ============================================================

const { prisma } = require('../../db/client');
const { searchGoogleHotels } = require('./serpApiClient');

/**
 * Fetches and filters hotel candidates from the live provider API.
 *
 * @param {object} tripContext
 * @param {string} tripContext.tripId
 * @param {string} tripContext.destination   e.g. "Goa"
 * @param {string} tripContext.travelDate    Check-in date (ISO)
 * @param {string} tripContext.returnDate    Check-out date (ISO)
 * @param {number} tripContext.travellers
 * @param {object} [tripContext.constraints] e.g. { min_rating: 4.0 }
 * @returns {Promise<object[]>} Curated hotel candidates saved in trip_candidates DB table
 */
async function fetchHotel(tripContext) {
  const {
    tripId,
    destination,
    travelDate,
    returnDate,
    travellers = 2,
    constraints = {},
  } = tripContext;

  console.log(`[PlannerAgent.fetchHotel] Searching live hotels in ${destination} (${travelDate || 'checkin'} -> ${returnDate || 'checkout'})`);

  // Fetch hotel options via SerpAPI client (or fallback simulator)
  const rawCandidates = await searchGoogleHotels({
    destination,
    checkInDate: travelDate,
    checkOutDate: returnDate,
    travellers,
  });

  // Apply constraint filtering (e.g. minimum rating)
  let filtered = rawCandidates;
  if (constraints.min_rating) {
    const minRating = Number(constraints.min_rating);
    filtered = rawCandidates.filter(c => (c.metadataJson?.rating ?? 0) >= minRating);
    // If filter removed all options, keep original candidates to avoid zero plans
    if (filtered.length === 0) filtered = rawCandidates;
  }

  // Set 30-minute price expiration window
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  // If tripId is provided, persist to trip_candidates DB table
  if (tripId) {
    // Mark existing active HOTEL candidates for this trip as superseded
    await prisma.tripCandidate.updateMany({
      where: { tripId, type: 'HOTEL', superseded: false },
      data: { superseded: true },
    });

    const savedCandidates = await Promise.all(
      filtered.map((c) =>
        prisma.tripCandidate.create({
          data: {
            tripId,
            type: 'HOTEL',
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

    console.log(`[PlannerAgent.fetchHotel] Persisted ${savedCandidates.length} hotel candidates to DB.`);
    return savedCandidates;
  }

  return filtered;
}

module.exports = fetchHotel;
