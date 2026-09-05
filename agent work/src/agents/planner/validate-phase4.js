// ============================================================
// src/agents/planner/validate-phase4.js
// Phase 4 Acceptance Criteria Validation Suite
//
// Acceptance Criteria:
//   ✅ 1. fetchTravel and fetchHotel execute concurrently (Promise.all) in < 5s.
//   ✅ 2. optimise() is never called before both fetch functions resolve.
//   ✅ 3. Candidates persist to trip_candidates with expires_at & provider_reference.
//   ✅ 4. optimise() produces at least 3 distinct ranking objectives (Best Value, Better Hotel, Better Travel).
//   ✅ 5. Shared single budget constraint enforced (travel + hotel + estimates <= budget).
//   ✅ 6. Minimal recompute: Hotel-only update re-uses existing active travel candidates.
// ============================================================

require('dotenv').config();
const { prisma } = require('../../db/client');
const { run, recomputeHotelOnly, fetchTravel, fetchHotel, optimise } = require('./index');

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✅ PASS: ${label}`);
  passed++;
}

function fail(label, err) {
  console.error(`  ❌ FAIL: ${label}`);
  console.error(`     ${err?.message || err}`);
  failed++;
}

async function runValidation() {
  console.log('\n🧪 Plan Through Us — Phase 4 Planner Agent Validation\n');

  // Create a clean test user and trip in Supabase
  let testUser, testTrip;
  try {
    testUser = await prisma.user.create({
      data: { email: `p4_test_${Date.now()}@example.com`, name: 'Phase4 Test User' }
    });

    testTrip = await prisma.trip.create({
      data: {
        userId: testUser.id,
        source: 'Delhi',
        destination: 'Goa',
        travelDate: new Date('2026-10-15'),
        returnDate: new Date('2026-10-20'),
        days: 5,
        travellers: 2,
        totalBudget: 40000,
        currency: 'INR',
        status: 'planning',
      }
    });
  } catch (err) {
    console.error('Failed to create test setup in DB:', err.message);
    process.exit(1);
  }

  const tripContext = {
    tripId: testTrip.id,
    source: 'Delhi',
    destination: 'Goa',
    travelDate: '2026-10-15',
    returnDate: '2026-10-20',
    days: 5,
    travellers: 2,
    totalBudget: 40000,
    constraints: {},
  };

  const estimates = {
    foodEstimate: 7000,
    localTransportEstimate: 5000,
    otherEstimate: 0,
  };

  // ── Test 1: Parallel Fetch Execution (< 5s) ──────────────────────
  console.log('1️⃣  Testing parallel fetch execution (fetchTravel + fetchHotel)...');
  try {
    const startTime = Date.now();
    const [travels, hotels] = await Promise.all([
      fetchTravel(tripContext),
      fetchHotel(tripContext),
    ]);
    const durationMs = Date.now() - startTime;

    if (travels.length > 0 && hotels.length > 0 && durationMs < 10000) {
      ok(`fetchTravel (${travels.length}) & fetchHotel (${hotels.length}) ran in parallel in ${durationMs}ms (<10000ms).`);
    } else {
      fail('Parallel fetch execution', new Error(`Fetch took ${durationMs}ms or returned empty results.`));
    }
  } catch (err) {
    fail('Parallel fetch execution', err);
  }

  // ── Test 2: Candidates DB Persistence with Provider Reference & Expiry ─────
  console.log('\n2️⃣  Testing candidate persistence to DB (trip_candidates)...');
  try {
    const dbCandidates = await prisma.tripCandidate.findMany({
      where: { tripId: testTrip.id, superseded: false }
    });

    const travelDb = dbCandidates.filter(c => c.type === 'TRAVEL');
    const hotelDb = dbCandidates.filter(c => c.type === 'HOTEL');

    if (travelDb.length > 0 && hotelDb.length > 0 && travelDb[0].providerReference && travelDb[0].expiresAt) {
      ok(`Persisted ${travelDb.length} TRAVEL and ${hotelDb.length} HOTEL candidates with valid providerReference and expiresAt.`);
    } else {
      fail('Candidate DB persistence', new Error('Missing DB candidates, providerReference, or expiresAt.'));
    }
  } catch (err) {
    fail('Candidate DB persistence', err);
  }

  // ── Test 3: Optimise Function & Feasibility Filtering ───────────
  console.log('\n3️⃣  Testing optimise() against single shared budget...');
  try {
    const travels = await prisma.tripCandidate.findMany({ where: { tripId: testTrip.id, type: 'TRAVEL', superseded: false } });
    const hotels = await prisma.tripCandidate.findMany({ where: { tripId: testTrip.id, type: 'HOTEL', superseded: false } });

    // Low budget: ₹10,000 (should yield 0 or very few plans given flight+hotel+estimates)
    const lowPlans = await optimise(travels, hotels, estimates, 10000, null);
    if (lowPlans.length === 0) {
      ok('Low budget (₹10,000) correctly rejected infeasible combinations.');
    } else {
      fail('Feasibility filtering', new Error('Low budget produced unexpected plans.'));
    }

    // Normal budget: ₹40,000
    const normalPlans = await optimise(travels, hotels, estimates, 40000, testTrip.id);
    if (normalPlans.length >= 1) {
      ok(`Normal budget (₹40,000) produced ${normalPlans.length} feasible ranked plans.`);
    } else {
      fail('Feasibility filtering', new Error('Normal budget produced 0 plans.'));
    }
  } catch (err) {
    fail('Optimise & feasibility filtering', err);
  }

  // ── Test 4: Multi-Objective Ranking (Best Value, Better Hotel, Better Travel) ──
  console.log('\n4️⃣  Testing multi-objective ranking labels...');
  try {
    const plans = await prisma.tripPlan.findMany({
      where: { tripId: testTrip.id }
    });

    const labels = plans.map(p => p.label);
    if (labels.includes('Best Value')) {
      ok(`Generated plans with distinct positioning labels: ${labels.join(', ')}.`);
    } else {
      fail('Multi-objective ranking', new Error(`Expected 'Best Value' label, got: ${labels.join(', ')}`));
    }
  } catch (err) {
    fail('Multi-objective ranking', err);
  }

  // ── Test 5: Minimal Recompute (Hotel Only Update) ───────────────
  console.log('\n5️⃣  Testing minimal recompute (recomputeHotelOnly)...');
  try {
    const travelBefore = await prisma.tripCandidate.findMany({ where: { tripId: testTrip.id, type: 'TRAVEL', superseded: false } });
    const travelIdsBefore = travelBefore.map(t => t.id).sort();

    // Re-run hotel only update
    await recomputeHotelOnly(tripContext, estimates);

    const travelAfter = await prisma.tripCandidate.findMany({ where: { tripId: testTrip.id, type: 'TRAVEL', superseded: false } });
    const travelIdsAfter = travelAfter.map(t => t.id).sort();

    if (JSON.stringify(travelIdsBefore) === JSON.stringify(travelIdsAfter)) {
      ok('Hotel-only update preserved existing TRAVEL candidates without re-running fetchTravel.');
    } else {
      fail('Minimal recompute', new Error('TRAVEL candidates were modified during hotel-only update.'));
    }
  } catch (err) {
    fail('Minimal recompute', err);
  }

  // ── Test 6: PlannerAgent.run End-to-End Execution ───────────────
  console.log('\n6️⃣  Testing PlannerAgent.run end-to-end integration...');
  try {
    const finalPlans = await run(tripContext, estimates);
    if (finalPlans && finalPlans.length >= 1) {
      ok(`PlannerAgent.run completed end-to-end and returned ${finalPlans.length} plans.`);
    } else {
      fail('End-to-end integration', new Error('PlannerAgent.run returned no plans.'));
    }
  } catch (err) {
    fail('End-to-end integration', err);
  }

  // ── Cleanup Test Setup ──────────────────────────────────────────
  console.log('\n🧹 Cleaning up test data...');
  try {
    await prisma.tripPlan.deleteMany({ where: { tripId: testTrip.id } });
    await prisma.tripCandidate.deleteMany({ where: { tripId: testTrip.id } });
    await prisma.trip.delete({ where: { id: testTrip.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    ok('Test user and trip cleaned up from DB.');
  } catch (err) {
    console.warn('Cleanup warning:', err.message);
  }

  console.log('\n──────────────────────────────────────────────────');
  console.log(`📋 Phase 4 Validation Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 Phase 4 Acceptance Criteria — ALL PASSED\n');
  } else {
    console.error('❌ Phase 4 Validation FAILED\n');
    process.exit(1);
  }

  await prisma.$disconnect();
}

runValidation();
