// ============================================================
// src/db/validate-phase1.js
// Phase 1 Acceptance Criteria Test Script
//
// Run with: node src/db/validate-phase1.js
//
// This script validates:
//   ✅ 1. Schema migrations applied (tables exist)
//   ✅ 2. Trip CRUD: create, update, status transitions
//   ✅ 3. Trip can be marked expired/completed
//   ✅ 4. Invalid status transitions are rejected
//   ✅ 5. Destination cost profiles are seeded
// ============================================================

require('dotenv').config();
const { prisma } = require('./client');
const {
  createTrip,
  transitionTripStatus,
  expireTrip,
  getActiveCandidates,
  supersedeCandidates,
  getDestinationCostProfile,
} = require('./helpers');

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

async function run() {
  console.log('\n🧪 Plan Through Us — Phase 1 Validation\n');

  // ── Test 1: Tables exist ────────────────────────────────
  console.log('1️⃣  Verifying tables exist...');
  try {
    await prisma.$queryRaw`SELECT 1 FROM users LIMIT 0`;
    await prisma.$queryRaw`SELECT 1 FROM trips LIMIT 0`;
    await prisma.$queryRaw`SELECT 1 FROM trip_requirements LIMIT 0`;
    await prisma.$queryRaw`SELECT 1 FROM trip_candidates LIMIT 0`;
    await prisma.$queryRaw`SELECT 1 FROM trip_cost_estimates LIMIT 0`;
    await prisma.$queryRaw`SELECT 1 FROM trip_plans LIMIT 0`;
    await prisma.$queryRaw`SELECT 1 FROM selected_plans LIMIT 0`;
    await prisma.$queryRaw`SELECT 1 FROM bookings LIMIT 0`;
    await prisma.$queryRaw`SELECT 1 FROM api_search_logs LIMIT 0`;
    await prisma.$queryRaw`SELECT 1 FROM destination_cost_profiles LIMIT 0`;
    ok('All 10 tables exist');
  } catch (e) {
    fail('Tables exist', e);
  }

  // ── Test 2: Create a user + trip ────────────────────────
  console.log('\n2️⃣  Creating test user and trip...');
  let testUser, testTrip;
  try {
    testUser = await prisma.user.create({
      data: {
        email: `test_${Date.now()}@example.com`,
        name: 'Test User',
      },
    });
    ok(`User created: ${testUser.id}`);

    testTrip = await createTrip({
      userId: testUser.id,
      source: 'Delhi',
      days: 5,
      travellers: 2,
      totalBudget: 40000,
    });
    ok(`Trip created with status: ${testTrip.status}`);
  } catch (e) {
    fail('Create user + trip', e);
  }

  // ── Test 3: Valid status transition ─────────────────────
  console.log('\n3️⃣  Testing valid status transitions...');
  if (testTrip) {
    try {
      const t1 = await transitionTripStatus(testTrip.id, 'searching');
      ok(`planning → searching: ${t1.status}`);

      const t2 = await transitionTripStatus(testTrip.id, 'review');
      ok(`searching → review: ${t2.status}`);

      const t3 = await transitionTripStatus(testTrip.id, 'selected_for_booking');
      ok(`review → selected_for_booking: ${t3.status}`);

      const t4 = await transitionTripStatus(testTrip.id, 'booking_in_progress');
      ok(`selected_for_booking → booking_in_progress: ${t4.status}`);

      const t5 = await transitionTripStatus(testTrip.id, 'booked');
      ok(`booking_in_progress → booked: ${t5.status}`);
    } catch (e) {
      fail('Status transitions', e);
    }
  }

  // ── Test 4: Invalid transition rejected ─────────────────
  console.log('\n4️⃣  Testing invalid transition rejection...');
  if (testTrip) {
    // Create a fresh trip for this test
    let t2;
    try {
      t2 = await createTrip({
        userId: testUser.id,
        source: 'Mumbai',
        days: 3,
        travellers: 1,
        totalBudget: 20000,
      });
      await transitionTripStatus(t2.id, 'booked'); // Invalid: planning → booked
      fail('Invalid transition: planning → booked should have thrown');
    } catch (e) {
      if (e.message.includes('Invalid transition')) {
        ok('Invalid transition correctly rejected: planning → booked');
      } else {
        fail('Unexpected error during invalid transition test', e);
      }
    }
  }

  // ── Test 5: Expire a trip ────────────────────────────────
  console.log('\n5️⃣  Testing trip expiry...');
  if (testUser) {
    try {
      const expirableTrip = await createTrip({
        userId: testUser.id,
        source: 'Chennai',
        days: 4,
        travellers: 2,
        totalBudget: 30000,
      });
      const expired = await expireTrip(expirableTrip.id);
      if (expired.status === 'expired' && expired.expiresAt !== null) {
        ok(`Trip expired correctly. expiresAt: ${expired.expiresAt.toISOString()}`);
      } else {
        fail('Trip expiry', new Error('status or expiresAt not set correctly'));
      }
    } catch (e) {
      fail('Expire trip', e);
    }
  }

  // ── Test 6: Destination cost profile lookup ─────────────
  console.log('\n6️⃣  Testing destination_cost_profiles...');
  try {
    const profile = await getDestinationCostProfile('Goa', 'standard');
    if (profile) {
      ok(`Goa standard profile: food=₹${profile.foodDailyPerPerson}/day/person, transport=₹${profile.transportDailyTotal}/day`);
    } else {
      fail('Destination cost profile', new Error('No profile found for Goa/standard — did you run the seed?'));
    }
  } catch (e) {
    fail('Destination cost profile lookup', e);
  }

  // ── Test 7: Candidate insertion + expiry filtering ──────
  console.log('\n7️⃣  Testing candidate insertion and active-candidate filtering...');
  if (testUser && testTrip) {
    try {
      // Insert a non-expired candidate
      await prisma.tripCandidate.create({
        data: {
          tripId: testTrip.id,
          type: 'TRAVEL',
          alias: 'T1',
          provider: 'TestAir',
          providerReference: 'TEST_RESULT_001',
          price: 8000,
          currency: 'INR',
          metadataJson: { from: 'DEL', to: 'GOI', stops: 0 },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +1 day
        },
      });

      // Insert an already-expired candidate
      await prisma.tripCandidate.create({
        data: {
          tripId: testTrip.id,
          type: 'TRAVEL',
          alias: 'T_STALE',
          provider: 'OldAir',
          providerReference: 'TEST_RESULT_STALE',
          price: 7000,
          currency: 'INR',
          metadataJson: { from: 'DEL', to: 'GOI', stops: 1 },
          expiresAt: new Date(Date.now() - 60 * 60 * 1000), // -1 hour (stale)
        },
      });

      const active = await getActiveCandidates(testTrip.id, 'TRAVEL');
      if (active.length === 1 && active[0].alias === 'T1') {
        ok('Active candidates filter correctly excludes stale candidates');
      } else {
        fail('Candidate filtering', new Error(`Expected 1 active, got ${active.length}`));
      }
    } catch (e) {
      fail('Candidate insertion + expiry filtering', e);
    }
  }

  // ── Test 8: Supersede pattern for replan ────────────────
  console.log('\n8️⃣  Testing supersede pattern (minimal-recompute)...');
  if (testUser && testTrip) {
    try {
      await supersedeCandidates(testTrip.id, 'TRAVEL');
      const afterSupersede = await getActiveCandidates(testTrip.id, 'TRAVEL');
      if (afterSupersede.length === 0) {
        ok('Supersede correctly removes all active TRAVEL candidates (preserves history)');
      } else {
        fail('Supersede pattern', new Error(`Expected 0 active, got ${afterSupersede.length}`));
      }
    } catch (e) {
      fail('Supersede pattern', e);
    }
  }

  // ── Cleanup ─────────────────────────────────────────────
  console.log('\n🧹 Cleaning up test data...');
  if (testUser) {
    try {
      // Must delete trips first — Trip.userId has no onDelete: Cascade
      await prisma.trip.deleteMany({ where: { userId: testUser.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
      ok('Test data cleaned up');
    } catch (e) {
      fail('Cleanup', e);
    }
  }

  // ── Summary ──────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log(`📋 Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 Phase 1 Acceptance Criteria — ALL PASSED\n');
  } else {
    console.log('⚠️  Some tests failed. Check output above.\n');
    process.exit(1);
  }
}

run()
  .catch((err) => {
    console.error('Validation script crashed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
