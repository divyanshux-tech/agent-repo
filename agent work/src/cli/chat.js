// ============================================================
// src/cli/chat.js
// Interactive CLI Chatbot for "Plan Through Us" platform.
//
// Run with: npm run chat (or node src/cli/chat.js)
// ============================================================

require('dotenv').config();
const readline = require('readline');
const { prisma } = require('../db/client');
const { processUserMessage } = require('../agents/orchestrator/orchestrator');

async function startChat() {
  console.log('\n============================================================');
  console.log('✈️   Plan Through Us — Hinglish AI Travel Planning Platform');
  console.log('============================================================');
  console.log('Type your message in Hinglish or English (e.g. "Delhi se 5 din ke liye 2 log Goa budget 40k").');
  console.log('Type "exit" or "quit" to stop.\n');

  // Create or get demo user
  let user;
  try {
    user = await prisma.user.upsert({
      where: { email: 'demo_user@example.com' },
      update: {},
      create: {
        email: 'demo_user@example.com',
        name: 'Demo Traveler'
      }
    });
  } catch (err) {
    console.error('Error connecting to DB:', err.message);
    process.exit(1);
  }

  let activeTripId = null;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const promptUser = () => {
    rl.question('\n👤 You: ', async (input) => {
      const trimmed = input.trim();
      if (!trimmed) {
        promptUser();
        return;
      }

      if (['exit', 'quit', 'bye'].includes(trimmed.toLowerCase())) {
        console.log('\n👋 Alvida! Happy Travels!');
        rl.close();
        await prisma.$disconnect();
        process.exit(0);
      }

      try {
        console.log('🤖 Thinking...');
        const result = await processUserMessage({
          userId: user.id,
          tripId: activeTripId,
          message: trimmed
        });

        activeTripId = result.tripId;

        console.log('\n------------------------------------------------------------');
        console.log(`🤖 Agent: ${result.reply}`);
        console.log('------------------------------------------------------------');
        console.log(`📊 Trip ID      : ${result.tripId}`);
        console.log(`🎯 Intent       : ${result.intent}`);
        console.log(`📌 Trip Status  : ${result.tripStatus}`);
        console.log(`🔍 Scope Route  : ${result.dispatchAction?.scope}`);
        if (result.missingSlots && result.missingSlots.length > 0) {
          console.log(`⚠️  Missing Slots : ${result.missingSlots.join(', ')}`);
        }
      } catch (err) {
        console.error('❌ Error processing message:', err.message);
      }

      promptUser();
    });
  };

  promptUser();
}

startChat();
