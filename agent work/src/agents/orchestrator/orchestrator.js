// ============================================================
// src/agents/orchestrator/orchestrator.js
// Phase 2 & Phase 4: Orchestrator Agent with Planner Integration
//
// Responsibilities:
// 1. Maintain trip state in DB (users, trips, trip_requirements).
// 2. Parse free-form Hinglish/English input via intentParser (Gemini).
// 3. Slot-filling validation (check required fields: source, days/dates, travellers, budget).
// 4. State Machine routing (planning -> searching -> review -> selected_for_booking -> booked).
// 5. Minimal-recompute dispatching & Planner Agent invocation.
// ============================================================

const { prisma } = require('../../db/client');
const { parseIntent } = require('./intentParser');
const { createTrip, transitionTripStatus } = require('../../db/helpers');
const { recommendDestinations, selectTripDestination } = require('../destination/destinationAgent');
const { trackClick } = require('../destination/interactionService');
const { getDestinationByName } = require('../../db/helpers');
const PlannerAgent = require('../planner');

// Helper to check missing required slots
function getMissingRequiredSlots(requirements, trip) {
  const missing = [];
  if (!trip?.source && !requirements?.source) missing.push('source (origin city)');
  if (!trip?.days && !requirements?.days && !trip?.travelDate) missing.push('days or travel dates');
  if (!trip?.travellers && !requirements?.travellers) missing.push('number of travellers');
  if (!trip?.totalBudget && !requirements?.totalBudget) missing.push('total budget');
  return missing;
}

/**
 * Format generated trip plans into a human-readable agent reply
 */
function formatPlansReply(plans, destination) {
  if (!plans || plans.length === 0) {
    return `Unfortunately, no feasible flight + hotel plans were found within your budget for ${destination}. Try increasing your total budget or adjusting travel dates.`;
  }

  let text = `🎉 I've generated ${plans.length} custom trip plans for your travel to **${destination}**:\n\n`;

  plans.forEach((p, idx) => {
    const travel = p.travelCandidate;
    const hotel = p.hotelCandidate;
    const travelPrice = travel ? Number(travel.price) : 0;
    const hotelPrice = hotel ? Number(hotel.price) : 0;
    const estTotal = Number(p.estimatedTotal);
    const label = p.label || `Plan ${idx + 1}`;

    const travelMeta = travel?.metadataJson || {};
    const hotelMeta = hotel?.metadataJson || {};

    text += `✈️  **Option ${idx + 1}: ${label}** (Total: ₹${estTotal.toLocaleString('en-IN')})\n`;
    if (travel) {
      text += `    • Flight: ${travel.provider} (${travelMeta.airline || 'Flight'} ${travelMeta.flightNumber || ''}) — ₹${travelPrice.toLocaleString('en-IN')}\n`;
    }
    if (hotel) {
      text += `    • Hotel: ${hotelMeta.hotelName || hotel.provider} (⭐ ${hotelMeta.rating || '4.0'}) — ₹${hotelPrice.toLocaleString('en-IN')}\n`;
    }
    text += `    • Est. Food & Transport: ₹${Number(p.nonBookedCostUsed || 0).toLocaleString('en-IN')}\n\n`;
  });

  text += `Which plan would you like to choose for booking? (e.g. "Select Plan 1")`;
  return text;
}

/**
 * Handles incoming user message for a trip.
 */
async function processUserMessage({ userId, tripId, message }) {
  if (!userId || !message) {
    throw new Error('userId and message are required.');
  }

  // 1. Load active trip & requirements if tripId provided
  let trip = null;
  if (tripId) {
    trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { requirements: true, selectedPlan: true }
    });
  }

  // 2. NLU Intent Parsing via Gemini / Fallback
  const nluResult = await parseIntent(message, trip);
  const { intent, extracted_slots, assistant_reply, reasoning } = nluResult;

  // 3. Create or update Trip & TripRequirement records in DB
  if (!trip) {
    const initialSource = extracted_slots.source || 'Delhi';
    const initialDestination = extracted_slots.destination || null;
    const initialDays = extracted_slots.days || 5;
    const initialTravellers = extracted_slots.travellers || 2;
    const initialBudget = extracted_slots.total_budget || 40000;

    trip = await createTrip({
      userId,
      source: initialSource,
      destination: initialDestination,
      days: initialDays,
      travellers: initialTravellers,
      totalBudget: initialBudget,
      currency: 'INR'
    });

    const req = await prisma.tripRequirement.create({
      data: {
        tripId: trip.id,
        interests: extracted_slots.interests || [],
        spendingStyle: extracted_slots.spending_style || 'standard',
        constraints: extracted_slots.constraints || {}
      }
    });

    trip.requirements = req;
  } else {
    const tripUpdates = {};
    if (extracted_slots.source) tripUpdates.source = extracted_slots.source;
    if (extracted_slots.destination) tripUpdates.destination = extracted_slots.destination;
    if (extracted_slots.days) tripUpdates.days = extracted_slots.days;
    if (extracted_slots.travellers) tripUpdates.travellers = extracted_slots.travellers;
    if (extracted_slots.total_budget) tripUpdates.totalBudget = extracted_slots.total_budget;
    if (extracted_slots.travel_date) tripUpdates.travelDate = new Date(extracted_slots.travel_date);

    if (Object.keys(tripUpdates).length > 0) {
      trip = await prisma.trip.update({
        where: { id: trip.id },
        data: tripUpdates,
        include: { requirements: true, selectedPlan: true }
      });
    }

    const reqUpdates = {};
    if (extracted_slots.interests && extracted_slots.interests.length > 0) {
      reqUpdates.interests = Array.from(new Set([...(trip.requirements?.interests || []), ...extracted_slots.interests]));
    }
    if (extracted_slots.spending_style) reqUpdates.spendingStyle = extracted_slots.spending_style;
    if (extracted_slots.constraints) {
      reqUpdates.constraints = { ...(trip.requirements?.constraints || {}), ...extracted_slots.constraints };
    }

    if (Object.keys(reqUpdates).length > 0) {
      const updatedReq = await prisma.tripRequirement.upsert({
        where: { tripId: trip.id },
        update: reqUpdates,
        create: {
          tripId: trip.id,
          interests: extracted_slots.interests || [],
          spendingStyle: extracted_slots.spending_style || 'standard',
          constraints: extracted_slots.constraints || {}
        }
      });
      trip.requirements = updatedReq;
    }
  }

  // 4. Determine Minimal-Recompute Dispatch Route
  const dispatchAction = determineDispatchRoute(intent, trip);

  // 4c. Execute Phase 3 & 4 agent actions
  let destinationRecommendations = null;
  let generatedPlans = null;
  let finalReply = assistant_reply;

  const shouldRecommend = intent === 'RECOMMEND_DESTINATIONS' || (!trip.destination && (intent === 'START_PLANNING' || intent === 'UPDATE_BUDGET'));

  if (shouldRecommend) {
    destinationRecommendations = await recommendDestinations({
      userId,
      source: trip.source,
      days: trip.days,
      travellers: trip.travellers,
      travelDate: trip.travelDate,
      totalBudget: Number(trip.totalBudget),
      interests: trip.requirements?.interests || [],
      spendingStyle: trip.requirements?.spendingStyle || 'standard'
    });

    if (destinationRecommendations?.recommendations?.length > 0) {
      let recText = `Here are the best destination recommendations for your budget (₹${Number(trip.totalBudget).toLocaleString('en-IN')}):\n\n`;
      destinationRecommendations.recommendations.forEach((r, idx) => {
        const reasoningText = r.hinglishReasoning || r.description || r.reasoning || 'Feasible destination within your budget.';
        recText += `📍 **${idx + 1}. ${r.destination}** (Est. Cost: ₹${r.estimatedTotalCost.toLocaleString('en-IN')})\n`;
        recText += `   • Match Score: ${(r.score * 100).toFixed(0)}%\n`;
        recText += `   • Reasoning: ${reasoningText}\n\n`;
      });
      recText += `Type the destination you want to select (e.g. "Select Manali" or "Lock Goa") to search live flights and hotels!`;
      finalReply = recText;
    }
  } else if ((intent === 'SELECT_DESTINATION' || intent === 'START_PLANNING') && extracted_slots.destination) {
    const lockResult = await selectTripDestination({
      tripId: trip.id,
      destination: extracted_slots.destination
    });
    trip = lockResult.trip;

    // Track click interaction for ML dataset
    try {
      const destRecord = await getDestinationByName(extracted_slots.destination);
      if (destRecord) {
        await trackClick(userId, destRecord.id);
      }
    } catch (err) {
      console.warn(`[Orchestrator] Failed to track interaction click: ${err.message}`);
    }
  }

  // 4c. Execute Phase 4 Planner Agent if destination is locked and search requested
  const shouldRunPlanner =
    trip.destination &&
    (dispatchAction.scope === 'FULL_SEARCH' ||
     dispatchAction.scope === 'FULL_REPLAN' ||
     dispatchAction.scope === 'PARTIAL_HOTEL_REPLAN' ||
     dispatchAction.scope === 'PARTIAL_TRAVEL_REPLAN' ||
     dispatchAction.scope === 'OPTIMIZER_ONLY');

  if (shouldRunPlanner) {
    console.log(`[Orchestrator] Triggering Planner Agent for trip ${trip.id} (Destination: ${trip.destination})...`);
    
    const estimates = {
      foodEstimate: (trip.days || 5) * (trip.travellers || 2) * 700,
      localTransportEstimate: (trip.days || 5) * 800,
      otherEstimate: 0
    };

    // Default travel date to 30 days in future if not set
    const defaultDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const travelDateObj = trip.travelDate ? new Date(trip.travelDate) : defaultDate;
    const returnDateObj = new Date(travelDateObj.getTime() + (trip.days || 5) * 24 * 60 * 60 * 1000);

    const tripContext = {
      tripId: trip.id,
      source: trip.source || 'Delhi',
      destination: trip.destination,
      travelDate: travelDateObj.toISOString().split('T')[0],
      returnDate: returnDateObj.toISOString().split('T')[0],
      days: trip.days || 5,
      travellers: trip.travellers || 2,
      totalBudget: Number(trip.totalBudget) || 40000,
      constraints: trip.requirements?.constraints || {}
    };

    if (trip.status === 'planning') {
      const updated = await transitionTripStatus(trip.id, 'searching');
      trip.status = updated.status;
    }

    if (dispatchAction.scope === 'PARTIAL_HOTEL_REPLAN') {
      await PlannerAgent.recomputeHotelOnly(tripContext, estimates);
    } else {
      await PlannerAgent.run(tripContext, estimates);
    }

    // Retrieve generated plans with candidate relations populated
    const populatedPlans = await prisma.tripPlan.findMany({
      where: { tripId: trip.id },
      include: {
        travelCandidate: true,
        hotelCandidate: true
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    generatedPlans = populatedPlans;

    if (trip.status === 'searching' && populatedPlans.length > 0) {
      const updated = await transitionTripStatus(trip.id, 'review');
      trip.status = updated.status;
    }

    finalReply = formatPlansReply(populatedPlans, trip.destination);
  }

  // 5. Check missing slots
  const missingSlots = getMissingRequiredSlots(trip.requirements, trip);

  return {
    tripId: trip.id,
    intent,
    tripStatus: trip.status,
    dispatchAction,
    destinationRecommendations,
    generatedPlans,
    extractedSlots: extracted_slots,
    missingSlots,
    reasoning,
    reply: finalReply,
    updatedTripState: trip
  };
}

/**
 * Minimal-recompute routing decision logic.
 */
function determineDispatchRoute(intent, trip) {
  switch (intent) {
    case 'CHANGE_HOTEL':
      return {
        rerunTravel: false,
        rerunHotel: true,
        rerunEstimator: false,
        rerunOptimizer: true,
        scope: 'PARTIAL_HOTEL_REPLAN'
      };

    case 'CHANGE_TRAVEL':
      return {
        rerunTravel: true,
        rerunHotel: false,
        rerunEstimator: false,
        rerunOptimizer: true,
        scope: 'PARTIAL_TRAVEL_REPLAN'
      };

    case 'UPDATE_BUDGET':
      return {
        rerunTravel: false,
        rerunHotel: false,
        rerunEstimator: false,
        rerunOptimizer: true,
        scope: 'OPTIMIZER_ONLY'
      };

    case 'SELECT_DESTINATION':
    case 'REPLAN_ALL':
      return {
        rerunTravel: true,
        rerunHotel: true,
        rerunEstimator: true,
        rerunOptimizer: true,
        scope: 'FULL_REPLAN'
      };

    case 'RECOMMEND_DESTINATIONS':
      return {
        scope: 'DESTINATION_RECOMMENDATION'
      };

    case 'CONFIRM_BOOKING':
      return {
        scope: 'BOOKING_SERVICE'
      };

    case 'SEARCH_COMPONENTS':
    case 'START_PLANNING':
    default:
      if (trip?.destination) {
        return {
          rerunTravel: true,
          rerunHotel: true,
          rerunEstimator: true,
          rerunOptimizer: true,
          scope: 'FULL_SEARCH'
        };
      }
      return {
        scope: 'CONVERSATION_ONLY'
      };
  }
}

module.exports = {
  processUserMessage,
  determineDispatchRoute
};
