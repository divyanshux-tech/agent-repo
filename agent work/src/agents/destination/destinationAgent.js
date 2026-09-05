// ============================================================
// src/agents/destination/destinationAgent.js
// Phase 3: Destination Recommendation Agent (Database-Backed)
//
// Features:
// 1. Fetches candidate destinations directly from DB (`destinations` table).
// 2. Content-based feature vector scoring (interests, activities, mountains, beaches, climbing, etc.).
// 3. Multi-factor scoring engine:
//    - Interest & Activity match score (0.30)
//    - Shared budget feasibility & score (0.30)
//    - Seasonality fit score (0.15)
//    - Trip duration fit score (0.10)
//    - Group size fit score (family/couple/group/solo) (0.10)
//    - Popularity & Safety quality score (0.05)
// 4. Logs user search parameters into `trip_searches`.
// 5. Stores ranked recommendation outputs in `recommendation_results`.
// 6. Gemini LLM Hinglish synthesis for personalized explanations.
// 7. Destination locking in `trips.destination` and downstream candidate superseding.
// ============================================================

const { getGeminiClient } = require('../orchestrator/geminiClient');
const { prisma } = require('../../db/client');
const {
  getAllActiveDestinations,
  supersedeCandidates,
  logTripSearch,
  logRecommendationResults
} = require('../../db/helpers');

// Mapping of common user keywords to destination feature column names
const FEATURE_KEYWORD_MAP = {
  mountain: 'mountainScore',
  mountains: 'mountainScore',
  hill: 'mountainScore',
  hills: 'mountainScore',
  snow: 'mountainScore',
  beach: 'beachScore',
  beaches: 'beachScore',
  sea: 'beachScore',
  ocean: 'beachScore',
  island: 'beachScore',
  climbing: 'climbingScore',
  rock_climbing: 'climbingScore',
  trekking: 'trekkingScore',
  trek: 'trekkingScore',
  hiking: 'trekkingScore',
  adventure: 'adventureScore',
  rafting: 'adventureScore',
  water_sports: 'adventureScore',
  scuba: 'adventureScore',
  nightlife: 'nightlifeScore',
  party: 'nightlifeScore',
  clubs: 'nightlifeScore',
  nature: 'natureScore',
  greenery: 'natureScore',
  forest: 'natureScore',
  culture: 'cultureScore',
  heritage: 'cultureScore',
  forts: 'cultureScore',
  history: 'cultureScore',
  food: 'foodScore',
  dining: 'foodScore',
  cafes: 'foodScore',
  relaxation: 'relaxationScore',
  peace: 'relaxationScore',
  chill: 'relaxationScore',
  spiritual: 'spiritualScore',
  temple: 'spiritualScore',
  yoga: 'spiritualScore'
};

/**
 * Maps traveller count to group style key
 */
function getGroupFitKey(travellers) {
  const count = Number(travellers) || 2;
  if (count === 1) return 'soloScore';
  if (count === 2) return 'coupleScore';
  if (count >= 3 && count <= 5) return 'groupScore';
  return 'familyScore';
}

/**
 * Recommends feasible destinations using DB content-based scoring engine.
 *
 * @param {object} params
 * @param {string} [params.userId] - Optional User ID for logging search & recommendations
 * @param {string} [params.source='Delhi'] - Origin city
 * @param {number} [params.days=5] - Trip duration in days
 * @param {number} [params.travellers=2] - Passenger count
 * @param {string|Date} [params.travelDate] - Planned travel date
 * @param {number} [params.totalBudget=40000] - Total shared budget in INR
 * @param {string[]} [params.interests=[]] - User interest tags
 * @param {string[]} [params.activities=[]] - User activity tags (e.g. ['climbing', 'trekking'])
 * @param {string} [params.spendingStyle='standard'] - 'budget' | 'standard' | 'luxury'
 * @returns {Promise<object>} Ranked destination recommendations
 */
async function recommendDestinations({
  userId = null,
  source = 'Delhi',
  days = 5,
  travellers = 2,
  travelDate = null,
  totalBudget = 40000,
  interests = [],
  activities = [],
  spendingStyle = 'standard'
} = {}) {
  const reqDays = Number(days) || 5;
  const reqTravellers = Number(travellers) || 2;
  const reqBudget = Number(totalBudget) || 40000;
  const style = spendingStyle && ['budget', 'standard', 'luxury'].includes(spendingStyle) ? spendingStyle : 'standard';

  // 1. Extract travel month (1-12) if date provided
  let travelMonth = null;
  if (travelDate) {
    const d = new Date(travelDate);
    if (!isNaN(d.getTime())) {
      travelMonth = d.getMonth() + 1;
    }
  }

  // 2. Combine user interests and activities for vector scoring
  const combinedKeywords = Array.from(
    new Set([...interests, ...activities].map((k) => String(k).toLowerCase().trim()))
  );

  // 3. Fetch active destinations from DB
  const destinations = await getAllActiveDestinations();

  if (destinations.length === 0) {
    return {
      source,
      days: reqDays,
      travellers: reqTravellers,
      totalBudget: reqBudget,
      totalEvaluated: 0,
      totalFeasible: 0,
      recommendations: []
    };
  }

  // 4. Log search query in `trip_searches` if userId provided
  if (userId) {
    try {
      await logTripSearch({
        userId,
        origin: source,
        travellers: reqTravellers,
        budget: reqBudget,
        duration: reqDays,
        travelDates: travelDate ? String(travelDate) : null,
        interests,
        activities,
        travelStyle: style
      });
    } catch (err) {
      console.warn(`[destinationAgent] Failed to log search: ${err.message}`);
    }
  }

  // 5. Score each destination in DB
  const groupKey = getGroupFitKey(reqTravellers);

  const scored = destinations.map((dest) => {
    // Determine daily rate based on requested spending style
    let dailyRate = Number(dest.standardDailyCost);
    if (style === 'budget') dailyRate = Number(dest.budgetDailyCost);
    if (style === 'luxury') dailyRate = Number(dest.luxuryDailyCost);

    const estStayCost = dailyRate * reqDays * reqTravellers;
    const estTransportCost = Number(dest.baseTransportCost) * reqTravellers;
    const estTotalCost = estStayCost + estTransportCost;

    // A. Budget Feasibility & Score
    const isFeasible = estTotalCost <= reqBudget;
    let budgetScore = 0;
    if (isFeasible) {
      const budgetUtilization = estTotalCost / reqBudget;
      budgetScore = budgetUtilization >= 0.5 && budgetUtilization <= 0.95 ? 1.0 : 0.8;
    } else {
      const overRatio = estTotalCost / reqBudget;
      budgetScore = Math.max(0, 1 - (overRatio - 1) * 2.5);
    }

    // B. Interest & Activity Feature Score (Dot Product)
    let interestScore = 0.5; // Baseline
    if (combinedKeywords.length > 0) {
      let matchedScoreSum = 0;
      let keywordsChecked = 0;

      combinedKeywords.forEach((kw) => {
        // Check exact feature mapping
        const featureCol = FEATURE_KEYWORD_MAP[kw];
        if (featureCol && dest[featureCol] !== undefined) {
          matchedScoreSum += Number(dest[featureCol]);
          keywordsChecked++;
        } else {
          // Fallback tag matching
          const matchedTag = dest.tags.some((t) => t.includes(kw) || kw.includes(t));
          if (matchedTag) {
            matchedScoreSum += 0.8;
            keywordsChecked++;
          }
        }
      });

      if (keywordsChecked > 0) {
        interestScore = Math.min(1.0, matchedScoreSum / keywordsChecked);
      }
    }

    // C. Seasonality Score
    let seasonScore = 0.8;
    if (travelMonth && dest.bestMonths && dest.bestMonths.length > 0) {
      seasonScore = dest.bestMonths.includes(travelMonth) ? 1.0 : 0.4;
    }

    // D. Duration Appropriateness Score
    let durationScore = 1.0;
    if (reqDays < dest.idealDaysMin) durationScore = 0.6;
    if (reqDays > dest.idealDaysMax) durationScore = 0.75;

    // E. Group Fit Score
    const groupScore = Number(dest[groupKey]) || 0.7;

    // F. Quality & Popularity Score
    const qualityScore = (Number(dest.safetyScore) * 0.5) + (Number(dest.popularityScore) * 0.5);

    // Weighted Combined Final Score
    const finalScore =
      (interestScore * 0.30) +
      (budgetScore * 0.30) +
      (seasonScore * 0.15) +
      (durationScore * 0.10) +
      (groupScore * 0.10) +
      (qualityScore * 0.05);

    return {
      destination: dest.name,
      id: dest.id,
      city: dest.city,
      state: dest.state,
      region: dest.region,
      tags: dest.tags,
      estimatedTotalCost: estTotalCost,
      estimatedStayCost: estStayCost,
      estimatedTransportCost: estTransportCost,
      isFeasible,
      score: Number(finalScore.toFixed(2)),
      description: dest.description,
      nearestAirport: dest.nearestAirport
    };
  });

  // 6. Sort candidates by score descending
  scored.sort((a, b) => b.score - a.score);

  // 7. Pick top 3 to 6 recommendations
  let topShortlist = scored.filter((d) => d.isFeasible).slice(0, 6);
  if (topShortlist.length < 3) {
    topShortlist = scored.slice(0, 4);
  }

  // 8. Log recommendation output to `recommendation_results` if userId present
  if (userId && topShortlist.length > 0) {
    try {
      await logRecommendationResults(
        userId,
        topShortlist.map((item, idx) => ({
          destinationId: item.id,
          score: item.score,
          rank: idx + 1
        })),
        'content_v1'
      );
    } catch (err) {
      console.warn(`[destinationAgent] Failed to log recommendations: ${err.message}`);
    }
  }

  // 9. Optional LLM Hinglish Synthesis via Gemini
  let synthesizedRecommendations = topShortlist;
  try {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (key && !key.includes('YOUR-')) {
      const { getGeminiClient, DEFAULT_MODEL } = require('../orchestrator/geminiClient');
      const ai = getGeminiClient();
      const prompt = `
User Trip Request:
- Origin: ${source}
- Duration: ${reqDays} days
- Passengers: ${reqTravellers} people
- Total Budget: ₹${reqBudget}
- Interests & Activities: ${combinedKeywords.join(', ') || 'General travel'}
- Travel Date: ${travelDate || 'Flexible'}

Top Matched Destinations:
${JSON.stringify(topShortlist, null, 2)}

Task: For each destination, provide a short 1-2 sentence personalized recommendation explanation in natural Hinglish explaining why this destination fits their trip and budget.
Return a JSON array of objects with keys: "id", "reasoning_hinglish".
`;

      const callLlm = ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('LLM response timeout (15s limit)')), 15000)
      );

      const response = await Promise.race([callLlm, timeoutPromise]);
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed)) {
        synthesizedRecommendations = topShortlist.map((item) => {
          const matchedLlm = parsed.find((p) => p.id === item.id || p.destination === item.destination);
          return {
            ...item,
            hinglishReasoning: matchedLlm ? matchedLlm.reasoning_hinglish : `${item.description} (Estimated cost ₹${item.estimatedTotalCost.toLocaleString('en-IN')})`
          };
        });
      }
    }
  } catch (err) {
    const isExpectedFallback =
      err.message &&
      (err.message.includes('429') ||
        err.message.includes('404') ||
        err.message.includes('RESOURCE_EXHAUSTED') ||
        err.message.includes('NOT_FOUND') ||
        err.message.includes('quota') ||
        err.message.includes('Missing valid Gemini API Key'));
    if (!isExpectedFallback) {
      console.warn(`[destinationAgent] Gemini synthesis fallback used: ${err.message}`);
    }
  }

  // Fallback reasoning if Hinglish reasoning is missing
  synthesizedRecommendations = synthesizedRecommendations.map((item) => ({
    ...item,
    hinglishReasoning: item.hinglishReasoning || `${item.description} Estimated total around ₹${item.estimatedTotalCost.toLocaleString('en-IN')} for ${reqDays} days.`
  }));

  return {
    source,
    days: reqDays,
    travellers: reqTravellers,
    totalBudget: reqBudget,
    interests: combinedKeywords,
    totalEvaluated: destinations.length,
    totalFeasible: scored.filter((d) => d.isFeasible).length,
    recommendations: synthesizedRecommendations
  };
}

/**
 * Locks selected destination in DB (trips.destination) and invalidates old candidates if changed.
 *
 * @param {object} params
 * @param {string} params.tripId - Active Trip ID
 * @param {string} params.destination - Selected destination name (e.g. 'Goa')
 * @returns {Promise<object>} Updated trip record
 */
async function selectTripDestination({ tripId, destination }) {
  if (!tripId || !destination) {
    throw new Error('tripId and destination are required.');
  }

  const existingTrip = await prisma.trip.findUniqueOrThrow({
    where: { id: tripId }
  });

  const destinationChanged = existingTrip.destination && existingTrip.destination !== destination;

  // Update trip destination in DB
  const updatedTrip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      destination: destination,
      status: 'planning' // Remains in planning state until explicit component search
    },
    include: {
      requirements: true
    }
  });

  // Minimal-Recompute Rule: If destination changed, mark downstream candidates as superseded
  if (destinationChanged) {
    await supersedeCandidates(tripId, 'TRAVEL');
    await supersedeCandidates(tripId, 'HOTEL');
    await supersedeCandidates(tripId, 'ACTIVITY');
  }

  return {
    trip: updatedTrip,
    destinationLocked: destination,
    destinationChanged
  };
}

module.exports = {
  recommendDestinations,
  selectTripDestination
};
