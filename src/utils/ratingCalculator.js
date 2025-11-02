// Updated rating calculation utility functions
import { beverageTypes } from './beverageTypes';

export const calculateFinalRating = (
  mainAttributes,
  bonusAttributes,
  userBonusOverride = null,
  hideBonus = false,
  beverageType = 'beer'
) => {
  const beverage = beverageTypes[beverageType] || beverageTypes.beer;
  const defaultWeightings = beverage.defaultWeights;
  const maxWeightSum = beverage.maxWeightSum; // 15

  // Calculate weighted average for main attributes (1-7 scale converted to proportion of 15)
  let totalWeightedScore = 0;
  let totalWeight = 0;

  Object.entries(mainAttributes).forEach(([attribute, data]) => {
    if (data.score !== null && data.score !== undefined && data.score > 0) {
      const weight = data.weight || defaultWeightings[attribute] || 0;
      // Convert 1-7 scale to proportion: (score - 1) / 6 * weight
      const scoreRatio = (data.score - 1) / 6; // 0 to 1
      const weightedScore = scoreRatio * weight;
      totalWeightedScore += weightedScore;
      totalWeight += weight;
    }
  });

  // Base rating from main attributes (out of 15, then we convert to 4.5 for final /5 score)
  const baseRating = totalWeight > 0 ? (totalWeightedScore / totalWeight) * maxWeightSum : 0;
  
  // Convert to 4.5 scale for final calculation
  const baseRatingOn4_5Scale = (baseRating / maxWeightSum) * 4.5;

  // Calculate bonus points (can be -0.5 to +0.5 to complete the /5 scale)
  let bonusPoints = 0;
  if (!hideBonus) {
    if (userBonusOverride !== null && userBonusOverride !== undefined) {
      bonusPoints = userBonusOverride;
    } else {
      bonusPoints = bonusAttributes.reduce((sum, attr) => sum + attr.weight, 0);
    }
  }

  // Ensure bonus points are within -0.5 to +0.5 range
  bonusPoints = Math.max(-0.5, Math.min(0.5, bonusPoints));

  // Final rating: baseRating (max 4.5) + bonusPoints (±0.5) = max 5.0
  const finalRating = Math.max(0, Math.min(5, baseRatingOn4_5Scale + (hideBonus ? 0 : bonusPoints)));

  return {
    baseRating: Math.round(baseRatingOn4_5Scale * 100) / 100,
    bonusPoints: Math.round(bonusPoints * 100) / 100,
    finalRating: Math.round(finalRating * 100) / 100,
    hideBonus,
    maxBase: 4.5
  };
};

export const calculateFinalScore = ({
  mainAttributes,
  selectedBonusAttributes = [],
  userBonusOverride = null,
  hideBonus = false,
  beverageType = 'beer'
} = {}) => {
  const rating = calculateFinalRating(
    mainAttributes || {},
    selectedBonusAttributes,
    userBonusOverride,
    hideBonus,
    beverageType
  );

  return rating.finalRating;
};

// Export descriptors and guidance from beverageTypes
export { ratingDescriptors, styleGuidance } from './beverageTypes';

export const bonusAttributeCategories = {
  emotionalImpact: {
    name: 'Emotional Impact',
    positive: [
      { id: 'memorable', name: 'Memorable', weight: 0.1 },
      { id: 'comforting', name: 'Comforting', weight: 0.08 },
      { id: 'exciting', name: 'Exciting', weight: 0.12 },
      { id: 'nostalgic', name: 'Nostalgic', weight: 0.08 },
      { id: 'uplifting', name: 'Uplifting', weight: 0.1 }
    ],
    negative: [
      { id: 'disappointing', name: 'Disappointing', weight: -0.12 },
      { id: 'boring', name: 'Boring', weight: -0.1 },
      { id: 'unpleasant', name: 'Unpleasant', weight: -0.15 },
      { id: 'forgettable', name: 'Forgettable', weight: -0.08 }
    ]
  },
  technicalExcellence: {
    name: 'Technical Excellence',
    positive: [
      { id: 'wellCrafted', name: 'Well-crafted', weight: 0.15 },
      { id: 'balanced', name: 'Balanced', weight: 0.12 },
      { id: 'complex', name: 'Complex', weight: 0.18 },
      { id: 'clean', name: 'Clean', weight: 0.1 },
      { id: 'innovative', name: 'Innovative', weight: 0.2 }
    ],
    negative: [
      { id: 'flawed', name: 'Flawed', weight: -0.18 },
      { id: 'unbalanced', name: 'Unbalanced', weight: -0.12 },
      { id: 'harsh', name: 'Harsh', weight: -0.15 },
      { id: 'muddy', name: 'Muddy', weight: -0.1 }
    ]
  },
  styleAccuracy: {
    name: 'Style Accuracy',
    positive: [
      { id: 'exemplary', name: 'Exemplary Example', weight: 0.18 },
      { id: 'authentic', name: 'Authentic', weight: 0.12 },
      { id: 'traditional', name: 'Traditional', weight: 0.1 }
    ],
    negative: [
      { id: 'offStyle', name: 'Off-style', weight: -0.15 },
      { id: 'misrepresented', name: 'Misrepresented', weight: -0.12 }
    ]
  },
  contextual: {
    name: 'Contextual Factors',
    positive: [
      { id: 'valueForMoney', name: 'Great Value', weight: 0.08 },
      { id: 'availability', name: 'Easy to Find', weight: 0.05 },
      { id: 'packaging', name: 'Great Packaging', weight: 0.05 },
      { id: 'seasonal', name: 'Perfect for Season', weight: 0.08 }
    ],
    negative: [
      { id: 'overpriced', name: 'Overpriced', weight: -0.1 },
      { id: 'hardToFind', name: 'Hard to Find', weight: -0.05 },
      { id: 'poorPackaging', name: 'Poor Packaging', weight: -0.05 }
    ]
  }
};

export const burpScale = {
  0: { label: 'None', description: 'No burp or gas release' },
  1: { label: 'Light', description: 'Gentle, subtle gas release' },
  2: { label: 'Moderate', description: 'Noticeable, satisfying burp' },
  3: { label: 'Strong', description: 'Robust, full-bodied burp with character' }
};

export function calculatePricePerPoint({ purchasePrice, retailPrice, finalScore }) {
  if (!finalScore || finalScore <= 0) {
    return { purchasePPP: null, retailPPP: null };
  }
  const purchasePPP = purchasePrice ? +(purchasePrice / finalScore).toFixed(2) : null;
  const retailPPP   = retailPrice   ? +(retailPrice / finalScore).toFixed(2)   : null;
  return { purchasePPP, retailPPP };
}

