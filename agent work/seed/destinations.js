// ============================================================
// seed/destinations.js
// Seeds the destination_cost_profiles table with initial data
// for MVP-supported destinations (India).
//
// Run with: node seed/destinations.js
// ============================================================

require('dotenv').config();
const { prisma } = require('../src/db/client');

const profiles = [
  // ── GOA ──────────────────────────────────────────────────
  { destination: 'Goa',      profileLevel: 'budget',   foodDailyPerPerson: 400,  transportDailyTotal: 600,  notes: 'Street food + shared transport' },
  { destination: 'Goa',      profileLevel: 'standard', foodDailyPerPerson: 800,  transportDailyTotal: 1200, notes: 'Restaurants + scooter rental' },
  { destination: 'Goa',      profileLevel: 'luxury',   foodDailyPerPerson: 2000, transportDailyTotal: 2500, notes: 'Fine dining + cab/private transfer' },

  // ── MANALI ───────────────────────────────────────────────
  { destination: 'Manali',   profileLevel: 'budget',   foodDailyPerPerson: 350,  transportDailyTotal: 500,  notes: 'Dhabas + shared taxi' },
  { destination: 'Manali',   profileLevel: 'standard', foodDailyPerPerson: 700,  transportDailyTotal: 1000, notes: 'Restaurants + local taxi/auto' },
  { destination: 'Manali',   profileLevel: 'luxury',   foodDailyPerPerson: 1800, transportDailyTotal: 2200, notes: 'Resorts dining + private cab' },

  // ── KERALA ───────────────────────────────────────────────
  { destination: 'Kerala',   profileLevel: 'budget',   foodDailyPerPerson: 400,  transportDailyTotal: 700,  notes: 'Local meals + KSRTC bus' },
  { destination: 'Kerala',   profileLevel: 'standard', foodDailyPerPerson: 900,  transportDailyTotal: 1500, notes: 'Restaurant meals + auto/taxi' },
  { destination: 'Kerala',   profileLevel: 'luxury',   foodDailyPerPerson: 2500, transportDailyTotal: 3000, notes: 'Resort dining + private AC cab' },

  // ── ANDAMAN ──────────────────────────────────────────────
  { destination: 'Andaman',  profileLevel: 'budget',   foodDailyPerPerson: 500,  transportDailyTotal: 600,  notes: 'Local eateries + government ferry' },
  { destination: 'Andaman',  profileLevel: 'standard', foodDailyPerPerson: 1000, transportDailyTotal: 1200, notes: 'Restaurants + hired boat' },
  { destination: 'Andaman',  profileLevel: 'luxury',   foodDailyPerPerson: 2500, transportDailyTotal: 2500, notes: 'Resort dining + private speedboat' },

  // ── PONDICHERRY ──────────────────────────────────────────
  { destination: 'Pondicherry', profileLevel: 'budget',   foodDailyPerPerson: 350,  transportDailyTotal: 400,  notes: 'Cafes + cycle rental' },
  { destination: 'Pondicherry', profileLevel: 'standard', foodDailyPerPerson: 750,  transportDailyTotal: 800,  notes: 'Restaurants + auto' },
  { destination: 'Pondicherry', profileLevel: 'luxury',   foodDailyPerPerson: 1800, transportDailyTotal: 1500, notes: 'Fine dining + cab' },

  // ── GOKARNA ──────────────────────────────────────────────
  { destination: 'Gokarna',  profileLevel: 'budget',   foodDailyPerPerson: 300,  transportDailyTotal: 300,  notes: 'Beach shacks + walking' },
  { destination: 'Gokarna',  profileLevel: 'standard', foodDailyPerPerson: 600,  transportDailyTotal: 600,  notes: 'Mid restaurants + auto' },
  { destination: 'Gokarna',  profileLevel: 'luxury',   foodDailyPerPerson: 1500, transportDailyTotal: 1200, notes: 'Resort dining + private cab' },

  // ── JAIPUR ───────────────────────────────────────────────
  { destination: 'Jaipur',   profileLevel: 'budget',   foodDailyPerPerson: 300,  transportDailyTotal: 400,  notes: 'Street food + auto' },
  { destination: 'Jaipur',   profileLevel: 'standard', foodDailyPerPerson: 700,  transportDailyTotal: 900,  notes: 'Restaurants + Ola/Uber' },
  { destination: 'Jaipur',   profileLevel: 'luxury',   foodDailyPerPerson: 2000, transportDailyTotal: 2000, notes: 'Heritage dining + private cab' },

  // ── SHIMLA ───────────────────────────────────────────────
  { destination: 'Shimla',   profileLevel: 'budget',   foodDailyPerPerson: 350,  transportDailyTotal: 400,  notes: 'Local dhabas + toy train' },
  { destination: 'Shimla',   profileLevel: 'standard', foodDailyPerPerson: 700,  transportDailyTotal: 800,  notes: 'Restaurants + taxi' },
  { destination: 'Shimla',   profileLevel: 'luxury',   foodDailyPerPerson: 1800, transportDailyTotal: 1800, notes: 'Hotel dining + private cab' },
];

async function seed() {
  console.log('🌱 Seeding destination_cost_profiles...\n');

  let created = 0;
  let skipped = 0;

  for (const profile of profiles) {
    try {
      await prisma.destinationCostProfile.upsert({
        where: {
          destination_profileLevel: {
            destination: profile.destination,
            profileLevel: profile.profileLevel,
          },
        },
        update: {
          foodDailyPerPerson: profile.foodDailyPerPerson,
          transportDailyTotal: profile.transportDailyTotal,
          notes: profile.notes,
        },
        create: profile,
      });
      console.log(`  ✅ ${profile.destination} [${profile.profileLevel}]`);
      created++;
    } catch (err) {
      console.error(`  ❌ Failed: ${profile.destination} [${profile.profileLevel}] — ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n📊 Done. Created/updated: ${created}, Failed: ${skipped}`);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
