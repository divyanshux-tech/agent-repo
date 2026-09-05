// ============================================================
// src/agents/destination/destinationsCatalog.js
// Phase 3: Destination Recommendation Agent
// Curated Destination Metadata Catalog for India Travel
// ============================================================

const DESTINATION_CATALOG = [
  {
    id: 'dest_goa',
    name: 'Goa',
    state: 'Goa',
    region: 'West',
    tags: ['beaches', 'nightlife', 'food', 'water_sports', 'relaxation', 'party'],
    dailyCostPerPerson: {
      budget: 1500,
      standard: 3000,
      luxury: 7000
    },
    baselineTransportCost: 4000, // Avg travel from major hubs
    bestMonths: [10, 11, 12, 1, 2, 3], // Oct - Mar
    idealDaysMin: 3,
    idealDaysMax: 7,
    nearestAirport: 'GOI / GOX',
    description: 'Sun-kissed beaches, vibrant nightlife, Portuguese heritage, and seafood.'
  },
  {
    id: 'dest_manali',
    name: 'Manali',
    state: 'Himachal Pradesh',
    region: 'North',
    tags: ['hills', 'adventure', 'snow', 'nature', 'relaxation', 'trekking', 'peace'],
    dailyCostPerPerson: {
      budget: 1200,
      standard: 2500,
      luxury: 6000
    },
    baselineTransportCost: 3500,
    bestMonths: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6],
    idealDaysMin: 3,
    idealDaysMax: 6,
    nearestAirport: 'KUU (Kullu-Manali)',
    description: 'Picturesque valley, snow-capped peaks, Solang adventure, and tranquil vibe.'
  },
  {
    id: 'dest_kerala',
    name: 'Kerala (Munnar & Alleppey)',
    state: 'Kerala',
    region: 'South',
    tags: ['backwaters', 'nature', 'tea_gardens', 'relaxation', 'food', 'family', 'peace'],
    dailyCostPerPerson: {
      budget: 1800,
      standard: 3500,
      luxury: 8000
    },
    baselineTransportCost: 5000,
    bestMonths: [9, 10, 11, 12, 1, 2, 3],
    idealDaysMin: 4,
    idealDaysMax: 8,
    nearestAirport: 'COK (Kochi)',
    description: 'Serene backwaters, lush Munnar tea estates, houseboat cruises, and authentic cuisine.'
  },
  {
    id: 'dest_andaman',
    name: 'Andaman & Nicobar Islands',
    state: 'Andaman & Nicobar',
    region: 'Islands',
    tags: ['beaches', 'scuba', 'water_sports', 'relaxation', 'nature', 'honeymoon'],
    dailyCostPerPerson: {
      budget: 2500,
      standard: 4500,
      luxury: 10000
    },
    baselineTransportCost: 9000,
    bestMonths: [10, 11, 12, 1, 2, 3, 4],
    idealDaysMin: 5,
    idealDaysMax: 8,
    nearestAirport: 'IXZ (Port Blair)',
    description: 'Pristine Radhanagar beach, crystal clear waters, scuba diving, and tropical escape.'
  },
  {
    id: 'dest_pondicherry',
    name: 'Pondicherry',
    state: 'Puducherry',
    region: 'South',
    tags: ['beaches', 'french_architecture', 'cafes', 'heritage', 'relaxation', 'food'],
    dailyCostPerPerson: {
      budget: 1200,
      standard: 2500,
      luxury: 5500
    },
    baselineTransportCost: 3000,
    bestMonths: [10, 11, 12, 1, 2, 3],
    idealDaysMin: 2,
    idealDaysMax: 4,
    nearestAirport: 'MAA (Chennai) / PNY',
    description: 'French Quarter charm, sea promenade, Auroville, quirky cafes, and quiet beaches.'
  },
  {
    id: 'dest_gokarna',
    name: 'Gokarna',
    state: 'Karnataka',
    region: 'South',
    tags: ['beaches', 'trekking', 'peace', 'budget_friendly', 'relaxation', 'nature'],
    dailyCostPerPerson: {
      budget: 1000,
      standard: 2000,
      luxury: 4500
    },
    baselineTransportCost: 3500,
    bestMonths: [10, 11, 12, 1, 2, 3],
    idealDaysMin: 3,
    idealDaysMax: 5,
    nearestAirport: 'GOI (Goa) / Hubli',
    description: 'Chill beach treks (Om Beach, Half Moon), laid-back shacks, and peaceful vibe.'
  },
  {
    id: 'dest_jaipur',
    name: 'Jaipur',
    state: 'Rajasthan',
    region: 'North-West',
    tags: ['heritage', 'forts', 'culture', 'shopping', 'food', 'architecture'],
    dailyCostPerPerson: {
      budget: 1100,
      standard: 2400,
      luxury: 6500
    },
    baselineTransportCost: 2000,
    bestMonths: [10, 11, 12, 1, 2, 3],
    idealDaysMin: 2,
    idealDaysMax: 4,
    nearestAirport: 'JAI (Jaipur)',
    description: 'Grand Amber Fort, Hawa Mahal, royal palaces, street food, and rich Rajasthani culture.'
  },
  {
    id: 'dest_shimla',
    name: 'Shimla',
    state: 'Himachal Pradesh',
    region: 'North',
    tags: ['hills', 'nature', 'colonial', 'family', 'snow', 'relaxation'],
    dailyCostPerPerson: {
      budget: 1300,
      standard: 2600,
      luxury: 5500
    },
    baselineTransportCost: 2500,
    bestMonths: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6],
    idealDaysMin: 2,
    idealDaysMax: 4,
    nearestAirport: 'SLV (Shimla) / IXC (Chandigarh)',
    description: 'Mall Road, Jakhu temple, Ridge views, pine forests, and cool mountain air.'
  },
  {
    id: 'dest_udaipur',
    name: 'Udaipur',
    state: 'Rajasthan',
    region: 'North-West',
    tags: ['lakes', 'romance', 'heritage', 'palaces', 'culture', 'luxury'],
    dailyCostPerPerson: {
      budget: 1400,
      standard: 3000,
      luxury: 8500
    },
    baselineTransportCost: 3000,
    bestMonths: [9, 10, 11, 12, 1, 2, 3],
    idealDaysMin: 3,
    idealDaysMax: 5,
    nearestAirport: 'UDR (Udaipur)',
    description: 'City of Lakes, royal boat cruises on Lake Pichola, stunning palaces, and romantic views.'
  },
  {
    id: 'dest_rishikesh',
    name: 'Rishikesh',
    state: 'Uttarakhand',
    region: 'North',
    tags: ['adventure', 'rafting', 'yoga', 'spirituality', 'nature', 'budget_friendly', 'peace'],
    dailyCostPerPerson: {
      budget: 900,
      standard: 1800,
      luxury: 4500
    },
    baselineTransportCost: 2000,
    bestMonths: [9, 10, 11, 12, 2, 3, 4, 5],
    idealDaysMin: 2,
    idealDaysMax: 5,
    nearestAirport: 'DED (Dehradun)',
    description: 'Ganga rafting, bungee jumping, peaceful ghats, cafes, and spiritual energy.'
  },
  {
    id: 'dest_coorg',
    name: 'Coorg (Madikeri)',
    state: 'Karnataka',
    region: 'South',
    tags: ['coffee_estates', 'hills', 'nature', 'waterfalls', 'peace', 'relaxation'],
    dailyCostPerPerson: {
      budget: 1300,
      standard: 2700,
      luxury: 6000
    },
    baselineTransportCost: 3000,
    bestMonths: [9, 10, 11, 12, 1, 2, 3],
    idealDaysMin: 3,
    idealDaysMax: 5,
    nearestAirport: 'MYQ (Mysore) / IXE (Mangalore)',
    description: 'Scotland of India, misty coffee plantations, waterfalls, and cozy homestays.'
  },
  {
    id: 'dest_ladakh',
    name: 'Ladakh (Leh)',
    state: 'Ladakh',
    region: 'North',
    tags: ['adventure', 'mountains', 'biking', 'lakes', 'monasteries', 'trekking'],
    dailyCostPerPerson: {
      budget: 2500,
      standard: 4500,
      luxury: 9000
    },
    baselineTransportCost: 8000,
    bestMonths: [5, 6, 7, 8, 9],
    idealDaysMin: 5,
    idealDaysMax: 9,
    nearestAirport: 'IXL (Leh)',
    description: 'Pangong Tso lake, Nubra Valley, high passes, monasteries, and epic road trips.'
  }
];

module.exports = { DESTINATION_CATALOG };
