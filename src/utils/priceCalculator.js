// Price Value Analysis Calculator

// PPADS Lookup Table (Price Per Alcohol Density Score)
const PPADS_BUCKETS = [
  { min: 0, max: 2.99, ppads: 50 },
  { min: 3.00, max: 3.99, ppads: 60 },
  { min: 4.00, max: 4.99, ppads: 70 },
  { min: 5.00, max: 5.99, ppads: 80 },
  { min: 6.00, max: 6.99, ppads: 90 },
  { min: 7.00, max: 7.99, ppads: 100 },
  { min: 8.00, max: 8.99, ppads: 110 },
  { min: 9.00, max: 9.99, ppads: 120 },
  { min: 10.00, max: 12.99, ppads: 130 },
  { min: 13.00, max: 15.99, ppads: 140 },
  { min: 16.00, max: 19.99, ppads: 150 },
  { min: 20.00, max: 24.99, ppads: 160 },
  { min: 25.00, max: 29.99, ppads: 170 },
  { min: 30.00, max: 39.99, ppads: 180 },
  { min: 40.00, max: 49.99, ppads: 190 },
  { min: 50.00, max: Infinity, ppads: 200 }
];

// Configuration
const CONFIG = {
  capMinMultiplier: 0.5,
  capMaxMultiplier: 2.5,
  w_purchase: 0.55,
  w_retail: 0.25,
  w_value: 0.20,
  MaxExpectedComposite: 5000
};

function lookupPPADS(price375) {
  const bucket = PPADS_BUCKETS.find(b => price375 >= b.min && price375 <= b.max);
  return bucket ? bucket.ppads : 200; // Default to highest if not found
}

export function calculatePriceValue(purchasePrice, retailPrice, volumeML, totalScore) {
  // Step A: Normalize to 375ml
  const PurchasePrice375 = (purchasePrice / volumeML) * 375;
  const RetailPrice375 = (retailPrice / volumeML) * 375;

  // Step B: Bin lookup for PPADS / RPADS
  const PPADS = lookupPPADS(PurchasePrice375);
  const RPADS = lookupPPADS(RetailPrice375);

  // Step C: Base Scores
  const PurchasePriceScore = (totalScore * 375) / PPADS;
  const RetailPriceScore = (totalScore * 375) / RPADS;

  // Step D: Relationship metrics
  let ValueMultiplier = 1;
  if (PurchasePrice375 > 0) {
    ValueMultiplier = RetailPrice375 / PurchasePrice375;
  }

  // Cap multiplier to avoid outliers
  ValueMultiplier = Math.max(CONFIG.capMinMultiplier, Math.min(CONFIG.capMaxMultiplier, ValueMultiplier));

  const SavingsPercent = RetailPrice375 > 0 ? 
    ((RetailPrice375 - PurchasePrice375) / RetailPrice375) * 100 : 0;

  // Step E: ValueScore (boost/penalty based on multiplier)
  const ValueScore = PurchasePriceScore * ValueMultiplier;

  // Step F: Composite (single-number) — configurable weights
  const CompositePriceValue = CONFIG.w_purchase * PurchasePriceScore +
                             CONFIG.w_retail * RetailPriceScore +
                             CONFIG.w_value * ValueScore;

  // Step G: Normalization to 0-100
  let NormalizedComposite = (CompositePriceValue / CONFIG.MaxExpectedComposite) * 100;
  NormalizedComposite = Math.max(0, Math.min(100, NormalizedComposite));

  // Step H: Descriptor for Price Score
  let Descriptor;
  if (PurchasePriceScore >= 170) {
    Descriptor = "Get me a case!!!";
  } else if (PurchasePriceScore >= 160) {
    Descriptor = "Get me another one NOW.";
  } else if (PurchasePriceScore >= 150) {
    Descriptor = "Yeah, I'll have another.";
  } else if (PurchasePriceScore >= 140) {
    Descriptor = "OK OK OK";
  } else {
    Descriptor = "GET OUT!";
  }

  return {
    PurchasePrice375,
    RetailPrice375,
    PPADS,
    RPADS,
    PurchasePriceScore,
    RetailPriceScore,
    ValueMultiplier,
    SavingsPercent,
    ValueScore,
    CompositePriceValue,
    NormalizedComposite,
    Descriptor
  };
}

export function getScoreDescriptor(score) {
  if (score >= 5.0) return "7 Out of 7";
  if (score >= 4.70) return "Amazing Starts Here";
  if (score >= 4.20) return "Highest of Commendments";
  if (score >= 3.70) return "Well Impressed";
  if (score >= 3.20) return "Not Bad";
  if (score >= 2.50) return "Drinkable";
  if (score >= 1.80) return "Must Be Commercial Lager";
  return "Sink Pour";
}

// Weighted beverage rating system for overall scores
export function calculateBeverageOverallScore(beverageRatings) {
  if (!beverageRatings || beverageRatings.length === 0) return 0;

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const rating of beverageRatings) {
    // Calculate user-level attribute score
    const userScore = (rating.Appearance * 0.10) +
                     (rating.Aroma * 0.25) +
                     (rating.Mouthfeel * 0.15) +
                     (rating.Taste * 0.40) +
                     (rating.Follow * 0.05) +
                     (rating.Bonus * 0.05);

    const weightedScore = userScore * rating.LevelWeight;
    totalWeightedScore += weightedScore;
    totalWeight += rating.LevelWeight;
  }

  return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
}