// ============================================================
// src/agents/orchestrator/intentParser.js
// Parses user messages (Hinglish/English) using Google Gemini
// into structured intent + extracted requirements slots.
// ============================================================

const { getGeminiClient, DEFAULT_MODEL } = require('./geminiClient');

const SYSTEM_PROMPT = `You are the NLU (Natural Language Understanding) brain for "Plan Through Us", a Hinglish travel planning platform in India.
Your job is to parse free-form user chat messages (written in English, Hinglish transliteration, or Hindi script) and extract structured trip intent and slots.

Recognized Action Intents:
1. START_PLANNING: User wants to plan a new trip or provides initial trip parameters (source, destination, budget, days, travellers).
2. RECOMMEND_DESTINATIONS: User asks for destination ideas/suggestions (e.g., "suggest some beach places under 40k", "kahan jau 5 din ke liye").
3. SELECT_DESTINATION: User explicitly picks a destination from options or names a destination to lock in (e.g., "Goa lock karo", "let's go to Manali", "select Manali").
4. SEARCH_COMPONENTS: User wants to generate travel and hotel plans (e.g., "show me options", "plans dikhao", "travel aur hotel find karo").
5. CHANGE_HOTEL: User specifically asks to change/update hotel preferences or candidates (e.g., "hotel change karo", "better hotel chahiye", "cheap stay dikhao").
6. CHANGE_TRAVEL: User specifically asks to change/update travel/flight preferences or candidates (e.g., "flight change karo", "non stop flight chahiye", "train option hai kya").
7. UPDATE_BUDGET: User updates total budget (e.g., "budget 50k kar do", "thoda sasta karo", "max 30000 budget hai").
8. REPLAN_ALL: User wants to reset and replan everything from scratch.
9. CONFIRM_BOOKING: User selects a plan to book (e.g., "Plan A book karo", "Best Value plan select kiya").
10. GENERAL_QUERY: User asks a general question about their current plan or travel advice.

Slot Extraction Rules:
- Extract values accurately from English and Hinglish phrases (e.g., "40k" -> 40000, "2 log" -> 2, "5 din" -> 5).
- If a slot is not mentioned in the new message, return null for that slot.
- For dates, convert relative or standard dates into YYYY-MM-DD if possible.
`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    intent: {
      type: 'STRING',
      enum: [
        'START_PLANNING',
        'RECOMMEND_DESTINATIONS',
        'SELECT_DESTINATION',
        'SEARCH_COMPONENTS',
        'CHANGE_HOTEL',
        'CHANGE_TRAVEL',
        'UPDATE_BUDGET',
        'REPLAN_ALL',
        'CONFIRM_BOOKING',
        'GENERAL_QUERY'
      ]
    },
    extracted_slots: {
      type: 'OBJECT',
      properties: {
        source: { type: 'STRING', nullable: true },
        destination: { type: 'STRING', nullable: true },
        days: { type: 'INTEGER', nullable: true },
        travellers: { type: 'INTEGER', nullable: true },
        total_budget: { type: 'NUMBER', nullable: true },
        travel_date: { type: 'STRING', nullable: true },
        interests: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          nullable: true
        },
        spending_style: {
          type: 'STRING',
          enum: ['budget', 'standard', 'luxury'],
          nullable: true
        },
        constraints: {
          type: 'OBJECT',
          properties: {
            non_stop_only: { type: 'BOOLEAN', nullable: true },
            min_hotel_rating: { type: 'NUMBER', nullable: true }
          },
          nullable: true
        },
        selected_plan_identifier: { type: 'STRING', nullable: true }
      }
    },
    confidence: { type: 'NUMBER' },
    reasoning: { type: 'STRING' },
    assistant_reply: { type: 'STRING' }
  },
  required: ['intent', 'extracted_slots', 'confidence', 'assistant_reply']
};

const ALL_DESTINATIONS = [
  'goa', 'manali', 'kerala', 'andaman', 'pondicherry', 'gokarna',
  'jaipur', 'shimla', 'udaipur', 'rishikesh', 'coorg', 'ladakh',
  'kasol', 'varanasi', 'darjeeling'
];

/**
 * Fallback pattern-based NLU parser used when GEMINI_API_KEY is not configured or rate-limited.
 */
function fallbackPatternParse(userMessage) {
  const msg = userMessage.toLowerCase();
  let intent = 'START_PLANNING';
  const slots = {};

  // Intent classification
  if (msg.includes('hotel change') || msg.includes('cheap stay') || msg.includes('better hotel')) {
    intent = 'CHANGE_HOTEL';
  } else if (msg.includes('flight change') || msg.includes('non stop') || msg.includes('train')) {
    intent = 'CHANGE_TRAVEL';
    if (msg.includes('non stop')) {
      slots.constraints = { non_stop_only: true };
    }
  } else if (msg.includes('budget') && (msg.includes('kar do') || msg.includes('update budget') || msg.includes('change budget'))) {
    intent = 'UPDATE_BUDGET';
  } else if (msg.includes('suggest') || msg.includes('recommend') || msg.includes('kahan') || msg.includes('place') || msg.includes('places') || msg.includes('options') || msg.includes('batao') || msg.includes('dikhao')) {
    intent = 'RECOMMEND_DESTINATIONS';
  } else if (msg.includes('lock') || msg.includes('select') || msg.includes('chalte hain') || msg.includes('chalna hai') || msg.includes('jaana hai')) {
    intent = 'SELECT_DESTINATION';
  } else if (msg.includes('reset') || msg.includes('replan') || msg.includes('naya plan')) {
    intent = 'REPLAN_ALL';
  } else if (msg.includes('book kar do') || msg.includes('plan a book') || msg.includes('confirm booking')) {
    intent = 'CONFIRM_BOOKING';
    slots.selected_plan_identifier = 'Plan A';
  } else if (msg.includes('timing') || msg.includes('kya hai')) {
    intent = 'GENERAL_QUERY';
  }

  // Extract destination if present
  for (const d of ALL_DESTINATIONS) {
    if (msg.includes(d)) {
      slots.destination = d.charAt(0).toUpperCase() + d.slice(1);
      if (intent === 'START_PLANNING' || msg.includes('select') || msg.includes('lock') || msg.includes('chalte')) {
        intent = 'SELECT_DESTINATION';
      }
      break;
    }
  }

  // Extract origin city
  if (msg.includes('delhi')) slots.source = 'Delhi';
  if (msg.includes('mumbai')) slots.source = 'Mumbai';
  if (msg.includes('bangalore') || msg.includes('bengaluru')) slots.source = 'Bangalore';
  if (msg.includes('chennai')) slots.source = 'Chennai';
  if (msg.includes('kolkata')) slots.source = 'Kolkata';

  // Extract trip days
  const daysMatch = msg.match(/(\d+)\s*(din|days|day)/);
  if (daysMatch) slots.days = parseInt(daysMatch[1]);

  // Extract travellers
  const paxMatch = msg.match(/(\d+)\s*(log|people|person|pax|travellers|travelers)/);
  if (paxMatch) slots.travellers = parseInt(paxMatch[1]);

  // Extract budget
  const budgetMatch =
    msg.match(/budget\s*(?:₹|rs\.?|inr)?\s*(\d+k|\d+000|\d+)/) ||
    msg.match(/(?:₹|rs\.?|inr)\s*(\d+k|\d+000|\d+)/) ||
    msg.match(/(\d+)k\s*budget/) ||
    msg.match(/(\d+)k/);

  if (budgetMatch) {
    const rawVal = budgetMatch[1];
    slots.total_budget = rawVal.endsWith('k') ? parseInt(rawVal) * 1000 : parseInt(rawVal);
  }

  // Extract interest keywords
  const interests = [];
  if (msg.includes('beach') || msg.includes('beaches') || msg.includes('samundar')) interests.push('beaches');
  if (msg.includes('food') || msg.includes('khana') || msg.includes('seafood')) interests.push('food');
  if (msg.includes('nightlife') || msg.includes('party') || msg.includes('clubs')) interests.push('nightlife');
  if (msg.includes('mountain') || msg.includes('mountains') || msg.includes('pahaad') || msg.includes('hill') || msg.includes('hills')) interests.push('mountains');
  if (msg.includes('climbing') || msg.includes('rock climbing')) interests.push('climbing');
  if (msg.includes('trekking') || msg.includes('trek') || msg.includes('hiking')) interests.push('trekking');
  if (msg.includes('adventure') || msg.includes('rafting') || msg.includes('sports')) interests.push('adventure');
  if (msg.includes('heritage') || msg.includes('fort') || msg.includes('palace') || msg.includes('culture')) interests.push('culture');
  if (msg.includes('peace') || msg.includes('chill') || msg.includes('relaxation') || msg.includes('sukoon')) interests.push('relaxation');
  if (msg.includes('spiritual') || msg.includes('yoga') || msg.includes('temple')) interests.push('spirituality');
  if (msg.includes('nature') || msg.includes('forest') || msg.includes('greenery')) interests.push('nature');

  if (interests.length > 0) slots.interests = interests;

  return {
    intent,
    extracted_slots: slots,
    confidence: 0.85,
    reasoning: 'Parsed using enhanced NLU pattern fallback engine.',
    assistant_reply: `Samajh gaya! Maine aapki requirement (${intent}) parse kar li hai.`
  };
}

/**
 * Parses user chat message and returns structured NLU output.
 * @param {string} userMessage - Raw message text
 * @param {object} [currentTripState] - Existing trip context in DB
 * @returns {Promise<object>} Structured NLU output
 */
async function parseIntent(userMessage, currentTripState = null) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  if (!key || key === 'sk-...' || key.includes('YOUR-')) {
    return fallbackPatternParse(userMessage);
  }

  try {
    const ai = getGeminiClient();
    const promptText = `
Current Trip State in Context:
${JSON.stringify(currentTripState || {}, null, 2)}

User Message:
"${userMessage}"
`;

    const callLlm = ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: promptText,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1
      }
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('NLU response timeout (15s limit)')), 15000)
    );

    const response = await Promise.race([callLlm, timeoutPromise]);
    const rawText = response.text;
    const parsed = JSON.parse(rawText);
    return parsed;
  } catch (err) {
    const isQuotaOrNotFoundError =
      err.message &&
      (err.message.includes('429') ||
        err.message.includes('404') ||
        err.message.includes('RESOURCE_EXHAUSTED') ||
        err.message.includes('NOT_FOUND') ||
        err.message.includes('quota'));
    if (isQuotaOrNotFoundError) {
      console.log('ℹ️  Gemini API unavailable or quota reached. Using enhanced NLU pattern fallback engine.');
    } else {
      console.warn(`[intentParser] Gemini API call issue: ${err.message}. Using pattern fallback.`);
    }
    return fallbackPatternParse(userMessage);
  }
}

module.exports = { parseIntent };
