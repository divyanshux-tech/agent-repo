// ============================================================
// src/db/helpers.js
// Reusable database helper functions for common trip operations.
// These enforce the business rules from the implementation plan:
//   - One shared wallet
//   - Status machine transitions
//   - Candidate expiry enforcement
// ============================================================

const { prisma } = require('./client');

// ── Status machine: valid transitions ────────────────────────
const VALID_TRANSITIONS = {
  planning:             ['searching', 'cancelled', 'expired'],
  searching:            ['review', 'planning', 'cancelled', 'expired'],
  review:               ['selected_for_booking', 'planning', 'cancelled', 'expired'],
  selected_for_booking: ['booking_in_progress', 'review', 'cancelled'],
  booking_in_progress:  ['booked', 'review', 'cancelled'],
  booked:               ['cancelled'],
  cancelled:            [],
  expired:              [],
};

/**
 * Creates a new trip record.
 * @param {object} data - Trip fields (userId, source, days, travellers, totalBudget, currency)
 * @returns {Promise<object>} Created trip
 */
async function createTrip(data) {
  const { userId, source, days, travellers, totalBudget, currency = 'INR' } = data;

  if (!userId || !source || !days || !travellers || !totalBudget) {
    throw new Error('Missing required fields: userId, source, days, travellers, totalBudget');
  }

  return prisma.trip.create({
    data: {
      userId,
      source,
      days: Number(days),
      travellers: Number(travellers),
      totalBudget,
      currency,
      status: 'planning',
    },
  });
}

/**
 * Transitions a trip to a new status, enforcing the state machine.
 * @param {string} tripId
 * @param {string} newStatus
 * @returns {Promise<object>} Updated trip
 */
async function transitionTripStatus(tripId, newStatus) {
  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
  const allowed = VALID_TRANSITIONS[trip.status] || [];

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid transition: ${trip.status} → ${newStatus}. Allowed: [${allowed.join(', ')}]`
    );
  }

  return prisma.trip.update({
    where: { id: tripId },
    data: { status: newStatus },
  });
}

/**
 * Marks a trip as expired (session timeout).
 * @param {string} tripId
 */
async function expireTrip(tripId) {
  return prisma.trip.update({
    where: { id: tripId },
    data: {
      status: 'expired',
      expiresAt: new Date(),
    },
  });
}

/**
 * Returns non-expired candidates for a trip and type.
 * Stale candidates (past expires_at) are excluded automatically.
 * @param {string} tripId
 * @param {'TRAVEL'|'HOTEL'|'ACTIVITY'} type
 */
async function getActiveCandidates(tripId, type) {
  return prisma.tripCandidate.findMany({
    where: {
      tripId,
      type,
      superseded: false,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Supersedes all existing candidates of a given type for a trip.
 * Call before inserting new candidates during replan.
 * @param {string} tripId
 * @param {'TRAVEL'|'HOTEL'|'ACTIVITY'} type
 */
async function supersedeCandidates(tripId, type) {
  return prisma.tripCandidate.updateMany({
    where: { tripId, type, superseded: false },
    data: { superseded: true },
  });
}

/**
 * Gets the destination cost profile for a destination + spending style.
 * Used by the Trip Expense Estimator (Phase 5).
 * @param {string} destination
 * @param {'budget'|'standard'|'luxury'} profileLevel
 */
async function getDestinationCostProfile(destination, profileLevel) {
  return prisma.destinationCostProfile.findUnique({
    where: {
      destination_profileLevel: { destination, profileLevel },
    },
  });
}

/**
 * Gets the latest cost estimate for a trip.
 * @param {string} tripId
 */
async function getLatestCostEstimate(tripId) {
  return prisma.tripCostEstimate.findFirst({
    where: { tripId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Returns all active destinations from the database.
 * Used by the Phase 3 Recommendation Engine.
 */
async function getAllActiveDestinations() {
  return prisma.destination.findMany({
    where: { isActive: true },
    orderBy: { popularityScore: 'desc' }
  });
}

/**
 * Gets a destination record by name (case-insensitive search).
 * @param {string} name
 */
async function getDestinationByName(name) {
  if (!name) return null;
  return prisma.destination.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      isActive: true
    }
  });
}

/**
 * Logs a user search query in `trip_searches` table.
 * @param {object} searchData
 */
async function logTripSearch({ userId, origin, travellers, budget, duration, travelDates, interests = [], activities = [], travelStyle = 'standard' }) {
  if (!userId) return null;
  return prisma.tripSearch.create({
    data: {
      userId,
      origin: origin || 'Delhi',
      travellers: Number(travellers) || 2,
      budget: Number(budget) || 40000,
      duration: Number(duration) || 5,
      travelDates: travelDates ? String(travelDates) : null,
      interests,
      activities,
      travelStyle
    }
  });
}

/**
 * Logs recommendation output in `recommendation_results` table.
 * @param {string} userId
 * @param {Array<{destinationId: string, score: number, rank: number}>} results
 * @param {string} modelVersion
 */
async function logRecommendationResults(userId, results, modelVersion = 'content_v1') {
  if (!userId || !Array.isArray(results) || results.length === 0) return [];
  const records = results.map((item, idx) => ({
    userId,
    destinationId: item.destinationId,
    score: item.score,
    rank: item.rank || (idx + 1),
    modelVersion
  }));
  return prisma.recommendationResult.createMany({
    data: records
  });
}

module.exports = {
  createTrip,
  transitionTripStatus,
  expireTrip,
  getActiveCandidates,
  supersedeCandidates,
  getDestinationCostProfile,
  getLatestCostEstimate,
  getAllActiveDestinations,
  getDestinationByName,
  logTripSearch,
  logRecommendationResults,
  VALID_TRANSITIONS,
};

