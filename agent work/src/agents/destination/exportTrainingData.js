// ============================================================
// src/agents/destination/exportTrainingData.js
// Phase 3: ML Training Dataset Export Script
//
// Joins user_interactions + destinations + trip_searches to generate
// a feature-rich training dataset for training ML ranking models
// (e.g. LightGBM / XGBoost / CatBoost).
//
// Usage: node src/agents/destination/exportTrainingData.js [--json|--csv]
// ============================================================

require('dotenv').config();
const { prisma } = require('../../db/client');
const fs = require('fs');
const path = require('path');

async function exportTrainingData(format = 'json') {
  console.log('📊 Exporting User Interaction & Search Data for ML Training...\n');

  // Fetch all user interactions with linked user, destination, and past search queries
  const interactions = await prisma.userInteraction.findMany({
    include: {
      user: true,
      destination: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${interactions.length} interaction records in DB.`);

  if (interactions.length === 0) {
    console.log('ℹ️ No interaction records found yet. As users engage with recommendations, interaction data will populate here.');
    return [];
  }

  // Fetch all searches for feature enrichment
  const searches = await prisma.tripSearch.findMany();
  const searchMapByUser = {};
  searches.forEach((s) => {
    if (!searchMapByUser[s.userId]) searchMapByUser[s.userId] = [];
    searchMapByUser[s.userId].push(s);
  });

  // Construct training dataset rows
  const dataset = interactions.map((interaction) => {
    const dest = interaction.destination;
    const userSearches = searchMapByUser[interaction.userId] || [];
    const latestSearch = userSearches[0] || {};

    // Target label for Learning-to-Rank (LTR):
    // 3 = Booked (highest positive)
    // 2 = Saved / High Rating (positive engagement)
    // 1 = Clicked (implicit positive)
    // 0 = Rejected / No action (negative)
    let label = 0;
    if (interaction.booked) label = 3;
    else if (interaction.saved || (interaction.rating && interaction.rating >= 4.0)) label = 2;
    else if (interaction.clicked) label = 1;
    else if (interaction.rejected) label = 0;

    return {
      interaction_id: interaction.id,
      user_id: interaction.userId,
      destination_id: interaction.destinationId,
      destination_name: dest.name,
      
      // Target Label
      label,
      clicked: interaction.clicked ? 1 : 0,
      saved: interaction.saved ? 1 : 0,
      booked: interaction.booked ? 1 : 0,
      rejected: interaction.rejected ? 1 : 0,
      user_rating: interaction.rating,

      // Context features from latest search
      search_origin: latestSearch.origin || null,
      search_travellers: latestSearch.travellers || 2,
      search_budget: latestSearch.budget ? Number(latestSearch.budget) : null,
      search_duration: latestSearch.duration || 5,
      search_travel_style: latestSearch.travelStyle || 'standard',
      search_interests_count: (latestSearch.interests || []).length,

      // Destination feature vector
      dest_average_cost: Number(dest.averageTripCost),
      dest_mountain_score: dest.mountainScore,
      dest_beach_score: dest.beachScore,
      dest_climbing_score: dest.climbingScore,
      dest_trekking_score: dest.trekkingScore,
      dest_adventure_score: dest.adventureScore,
      dest_nightlife_score: dest.nightlifeScore,
      dest_nature_score: dest.natureScore,
      dest_culture_score: dest.cultureScore,
      dest_food_score: dest.foodScore,
      dest_relaxation_score: dest.relaxationScore,
      dest_spiritual_score: dest.spiritualScore,
      dest_family_score: dest.familyScore,
      dest_couple_score: dest.coupleScore,
      dest_group_score: dest.groupScore,
      dest_solo_score: dest.soloScore,
      dest_safety_score: dest.safetyScore,
      dest_popularity_score: dest.popularityScore,

      timestamp: interaction.createdAt.toISOString()
    };
  });

  const outputDir = path.join(__dirname, '../../../data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (format === 'csv') {
    const csvPath = path.join(outputDir, 'ml_training_data.csv');
    const headers = Object.keys(dataset[0]).join(',');
    const rows = dataset.map((row) =>
      Object.values(row)
        .map((val) => (val === null ? '' : typeof val === 'string' ? `"${val}"` : val))
        .join(',')
    );
    fs.writeFileSync(csvPath, [headers, ...rows].join('\n'));
    console.log(`\n✅ ML training dataset exported to CSV: ${csvPath}`);
  } else {
    const jsonPath = path.join(outputDir, 'ml_training_data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(dataset, null, 2));
    console.log(`\n✅ ML training dataset exported to JSON: ${jsonPath}`);
  }

  return dataset;
}

if (require.main === module) {
  const formatArg = process.argv.includes('--csv') ? 'csv' : 'json';
  exportTrainingData(formatArg)
    .catch((err) => console.error('Export failed:', err))
    .finally(() => prisma.$disconnect());
}

module.exports = { exportTrainingData };
