// ============================================================
// src/agents/destination/interactionService.js
// Phase 3: User Interaction Tracking Service
//
// Tracks every user engagement with destinations:
//   click, save, booking, rejection, rating.
// This data feeds the ML training pipeline for future
// LightGBM/XGBoost model training.
// ============================================================

const { prisma } = require('../../db/client');

/**
 * Records that a user clicked on a destination recommendation.
 * @param {string} userId
 * @param {string} destinationId
 * @returns {Promise<object>} Created or updated interaction record
 */
async function trackClick(userId, destinationId) {
  return prisma.userInteraction.create({
    data: {
      userId,
      destinationId,
      clicked: true
    }
  });
}

/**
 * Records that a user saved/bookmarked a destination.
 * @param {string} userId
 * @param {string} destinationId
 * @returns {Promise<object>}
 */
async function trackSave(userId, destinationId) {
  // Find the most recent interaction for this user+dest, or create new
  const existing = await prisma.userInteraction.findFirst({
    where: { userId, destinationId },
    orderBy: { createdAt: 'desc' }
  });

  if (existing) {
    return prisma.userInteraction.update({
      where: { id: existing.id },
      data: { saved: true }
    });
  }

  return prisma.userInteraction.create({
    data: {
      userId,
      destinationId,
      saved: true
    }
  });
}

/**
 * Records that a user booked a trip to this destination.
 * @param {string} userId
 * @param {string} destinationId
 * @returns {Promise<object>}
 */
async function trackBooking(userId, destinationId) {
  const existing = await prisma.userInteraction.findFirst({
    where: { userId, destinationId },
    orderBy: { createdAt: 'desc' }
  });

  if (existing) {
    return prisma.userInteraction.update({
      where: { id: existing.id },
      data: { booked: true }
    });
  }

  return prisma.userInteraction.create({
    data: {
      userId,
      destinationId,
      booked: true
    }
  });
}

/**
 * Records that a user explicitly rejected/skipped a destination.
 * @param {string} userId
 * @param {string} destinationId
 * @returns {Promise<object>}
 */
async function trackRejection(userId, destinationId) {
  const existing = await prisma.userInteraction.findFirst({
    where: { userId, destinationId },
    orderBy: { createdAt: 'desc' }
  });

  if (existing) {
    return prisma.userInteraction.update({
      where: { id: existing.id },
      data: { rejected: true }
    });
  }

  return prisma.userInteraction.create({
    data: {
      userId,
      destinationId,
      rejected: true
    }
  });
}

/**
 * Records a user rating for a destination (1.0 – 5.0).
 * @param {string} userId
 * @param {string} destinationId
 * @param {number} rating - Rating between 1.0 and 5.0
 * @returns {Promise<object>}
 */
async function trackRating(userId, destinationId, rating) {
  const clampedRating = Math.max(1, Math.min(5, Number(rating) || 3));

  const existing = await prisma.userInteraction.findFirst({
    where: { userId, destinationId },
    orderBy: { createdAt: 'desc' }
  });

  if (existing) {
    return prisma.userInteraction.update({
      where: { id: existing.id },
      data: { rating: clampedRating }
    });
  }

  return prisma.userInteraction.create({
    data: {
      userId,
      destinationId,
      rating: clampedRating
    }
  });
}

/**
 * Returns all interactions for a user, most recent first.
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function getUserHistory(userId) {
  return prisma.userInteraction.findMany({
    where: { userId },
    include: { destination: true },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Returns interaction counts grouped by destination for a user.
 * Useful for building user preference profiles.
 * @param {string} userId
 * @returns {Promise<object>} Map of destinationId → interaction summary
 */
async function getUserPreferenceProfile(userId) {
  const interactions = await prisma.userInteraction.findMany({
    where: { userId },
    include: { destination: true }
  });

  const profile = {};
  for (const interaction of interactions) {
    const destId = interaction.destinationId;
    if (!profile[destId]) {
      profile[destId] = {
        destinationId: destId,
        destinationName: interaction.destination.name,
        clicks: 0,
        saves: 0,
        bookings: 0,
        rejections: 0,
        ratings: [],
        avgRating: null
      };
    }
    if (interaction.clicked) profile[destId].clicks++;
    if (interaction.saved) profile[destId].saves++;
    if (interaction.booked) profile[destId].bookings++;
    if (interaction.rejected) profile[destId].rejections++;
    if (interaction.rating != null) profile[destId].ratings.push(interaction.rating);
  }

  // Calculate average ratings
  for (const destId in profile) {
    const ratings = profile[destId].ratings;
    if (ratings.length > 0) {
      profile[destId].avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    }
  }

  return profile;
}

module.exports = {
  trackClick,
  trackSave,
  trackBooking,
  trackRejection,
  trackRating,
  getUserHistory,
  getUserPreferenceProfile
};
