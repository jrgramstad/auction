// City tier classifications
const cityTiers = {
  tier1: [ // +0.5 points
    'McKinney', 'Plano', 'Frisco', 'Allen', 'Prosper', 'Celina',
    'Princeton', 'Little Elm', 'Aubrey', 'Wylie', 'Murphy',
    'Parker', 'Lucas', 'Fairview', 'Lowry Crossing', 'Melissa',
    'Garland', 'Mesquite', 'Carrollton', 'Lewisville'
  ],
  tier2: [ // +0.2 points
    'Fort Worth', 'Dallas', 'Arlington', 'Grand Prairie', 'Rockwall',
    'Irving', 'Denison', 'Flower Mound', 'Rowlett', 'Bedford',
    'Oak Point', 'Sherman'
  ],
  tier3: [ // 0 points
    'Forney', 'Desoto', 'Midlothian', 'Cedar Hill', 'Waxahachie',
    'Royse City', 'Mansfield', 'Crowley', 'Lancaster', 'Glenn Heights',
    'Seagoville', 'Josephine', 'Sanger'
  ],
  penalty: ['Terrell'], // -0.3 points
  exclude: [ // Auto-exclude these cities
    'Heartland', 'Watauga', 'Ennis', 'Justin', 'Cleburne',
    'Commerce', 'Ector', 'Kaufman', 'Quinlan'
  ]
};

// Get city tier (returns 1, 2, 3, -1 for penalty, or null for exclude)
function getCityTier(city) {
  if (!city) return 3; // Default to tier 3 if no city

  const cityName = city.trim();

  if (cityTiers.tier1.includes(cityName)) return 1;
  if (cityTiers.tier2.includes(cityName)) return 2;
  if (cityTiers.tier3.includes(cityName)) return 3;
  if (cityTiers.penalty.includes(cityName)) return -1;
  if (cityTiers.exclude.includes(cityName)) return null;

  return 3; // Default to tier 3
}

// Calculate auto score for a property
function calculateAutoScore(property) {
  let score = 4.5; // Base score

  // Age scoring (50% weight)
  const currentYear = new Date().getFullYear();
  const age = currentYear - (property.year_built || currentYear);

  if (age <= 5) score += 2.0;
  else if (age <= 14) score += 1.5;
  else if (age <= 24) score += 0.5;
  else if (age <= 30) score += 0;
  else score -= 0.5;

  // Size scoring (15% weight)
  if (property.sqft) {
    if (property.sqft <= 2300) score += 1.5;
    else if (property.sqft <= 2600) score += 1.0;
    else if (property.sqft <= 3000) score += 0.5;
  }

  // Property type (10% weight)
  if (property.property_type === 'Single Family') score += 0.9;
  else if (property.property_type === 'Townhouse' || property.property_type === 'Townhome') score += 0.3;

  // City tier scoring (10% weight)
  const cityTier = getCityTier(property.city);
  if (cityTier === 1) score += 0.5;
  else if (cityTier === 2) score += 0.2;
  else if (cityTier === 3) score += 0;
  else if (cityTier === -1) score -= 0.3;

  // Last sold bonus (15% weight)
  if (property.last_sold_date) {
    const soldYear = new Date(property.last_sold_date).getFullYear();
    if (soldYear >= 2020 && soldYear <= 2024) score += 0.5;
    else if (soldYear >= 2015) score += 0.3;
    else if (soldYear >= 2010) score += 0.1;
  }

  // COVID bonuses
  if (property.year_built >= 2020) score += 0.3;
  if (property.last_sold_date) {
    const soldYear = new Date(property.last_sold_date).getFullYear();
    if (soldYear >= 2020 && soldYear <= 2022) score += 0.2;
  }

  // Roddy data bonus
  if (property.roddy_id) score += 0.7;

  return Math.min(10, Math.round(score * 10) / 10); // Cap at 10.0
}

// Check exclusion rules and return property with exclusion data
function checkExclusions(property) {
  const exclusions = [];

  // Pool check (any indication = exclude)
  if (property.pool_roddy === 'P' ||
      property.pool_satellite === 'Y' ||
      property.pool_realtor === 'Y') {
    exclusions.push('Has Pool');
    property.has_pool = true;
  }

  // Solar check
  if (property.has_solar) {
    exclusions.push('Has Solar Panels');
  }

  // Size check
  if (property.sqft && property.sqft > 3000) {
    exclusions.push('Over 3,000 sqft');
  }

  // Value check
  if (property.realtor_value && property.realtor_value > 500000) {
    exclusions.push('Over $500k value');
  }

  // City check
  const cityTier = getCityTier(property.city);
  if (cityTier === null) {
    exclusions.push('Excluded City');
  }

  // Property type check
  const validTypes = ['Single Family', 'Townhouse', 'Townhome'];
  if (property.property_type && !validTypes.includes(property.property_type)) {
    exclusions.push('Wrong Property Type');
  }

  if (exclusions.length > 0) {
    property.is_excluded = true;
    property.exclusion_reason = exclusions.join(', ');
  } else {
    property.is_excluded = false;
    property.exclusion_reason = null;
  }

  return property;
}

// Calculate max bid based on JR grade and other factors
function calculateMaxBid(property) {
  if (!property.realtor_value || property.is_excluded) return 0;

  let bidPercent = 70; // Base

  // Score-based bidding
  if (property.jr_grade >= 10) bidPercent = 78;
  else if (property.jr_grade >= 9) bidPercent = 76;
  else if (property.jr_grade >= 8) bidPercent = 74;
  else if (property.jr_grade >= 7) bidPercent = 72;
  else if (property.jr_grade >= 6) bidPercent = 70;
  else bidPercent = 68;

  // Year built adjustment
  if (property.year_built >= 2020) bidPercent += 3;
  else if (property.year_built >= 2015) bidPercent += 2;
  else if (property.year_built >= 2010) bidPercent += 0;
  else if (property.year_built < 2010) bidPercent -= 2;

  // City tier adjustment
  const tier = getCityTier(property.city);
  if (tier === 1) bidPercent += 1;
  else if (tier === 3) bidPercent -= 1;

  let maxBid = property.realtor_value * (bidPercent / 100);

  // Apply feel adjustment if set
  if (property.feel_adjustment) {
    maxBid += property.feel_adjustment;
  }

  return Math.round(maxBid);
}

// Calculate equity percent
function calculateEquityPercent(property) {
  if (!property.realtor_value || !property.winning_bid) return 0;

  const equity = property.realtor_value - property.winning_bid;
  return Math.round((equity / property.realtor_value) * 100);
}
