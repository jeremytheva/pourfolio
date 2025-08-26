// Rating calculation utility functions with enhanced 1-7 scale
export const calculateFinalRating = (mainAttributes, bonusAttributes, userBonusOverride = null, hideBonus = false) => {
  // Default weightings if not specified (sum should not exceed 15)
  const defaultWeightings = {
    design: 2.0,
    appearance: 2.5,
    aroma: 3.0,
    mouthfeel: 3.0,
    flavour: 3.5,
    follow: 1.0
  };

  // Calculate weighted average for main attributes (1-7 scale converted to 0-5)
  let totalWeightedScore = 0;
  let totalWeight = 0;

  Object.entries(mainAttributes).forEach(([attribute, data]) => {
    if (data.score !== null && data.score !== undefined && data.score > 0) {
      const weight = data.weight || defaultWeightings[attribute] || 0;
      // Convert 1-7 scale to 0-5 scale: (score - 1) * (5/6)
      const convertedScore = (data.score - 1) * (5/6);
      totalWeightedScore += convertedScore * weight;
      totalWeight += weight;
    }
  });

  // Base rating from main attributes (out of 5)
  const baseRating = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;

  // Calculate bonus points
  let bonusPoints = 0;
  if (!hideBonus) {
    if (userBonusOverride !== null && userBonusOverride !== undefined) {
      bonusPoints = userBonusOverride;
    } else {
      bonusPoints = bonusAttributes.reduce((sum, attr) => sum + attr.weight, 0);
    }
  }

  // Ensure bonus points are within -2 to +2 range
  bonusPoints = Math.max(-2, Math.min(2, bonusPoints));

  // Final rating (capped at 0-5)
  const finalRating = Math.max(0, Math.min(5, baseRating + (hideBonus ? 0 : bonusPoints)));

  return {
    baseRating: Math.round(baseRating * 100) / 100,
    bonusPoints: Math.round(bonusPoints * 100) / 100,
    finalRating: Math.round(finalRating * 100) / 100,
    hideBonus
  };
};

// 1-7 Scale descriptors for each attribute
export const ratingDescriptors = {
  design: {
    1: "Poor Design",
    2: "Below Average",
    3: "Average Design", 
    4: "Good Design",
    5: "Very Good",
    6: "Excellent Design",
    7: "Perfect Design"
  },
  appearance: {
    1: "Unappealing",
    2: "Below Average",
    3: "Average Look",
    4: "Good Looking",
    5: "Very Appealing",
    6: "Beautiful",
    7: "Get In Me Already"
  },
  aroma: {
    1: "Off-putting",
    2: "Weak Aroma",
    3: "Average Aroma",
    4: "Pleasant",
    5: "Great Aroma",
    6: "Amazing Smell",
    7: "Intoxicating"
  },
  mouthfeel: {
    1: "Unpleasant",
    2: "Poor Texture",
    3: "Average Feel",
    4: "Good Texture",
    5: "Great Feel",
    6: "Excellent Body",
    7: "Perfect Mouthfeel"
  },
  flavour: {
    1: "Awful Taste",
    2: "Poor Flavour",
    3: "Average Taste",
    4: "Good Flavour",
    5: "Great Taste",
    6: "Amazing Flavour",
    7: "Mind-blowing"
  },
  follow: {
    1: "Harsh Finish",
    2: "Poor Finish",
    3: "Average Finish",
    4: "Good Finish",
    5: "Great Finish",
    6: "Excellent Finish",
    7: "Perfect Finish"
  }
};

// Style-specific guidance for rating
export const styleGuidance = {
  "American IPA": {
    appearance: "Expect pale gold to amber color with good clarity and persistent white head",
    aroma: "Prominent hop aroma of citrus, pine, or floral notes with supporting malt sweetness",
    mouthfeel: "Medium-light to medium body with moderate to high carbonation",
    flavour: "Strong hop flavor balanced by caramel malt sweetness, clean fermentation",
    follow: "Medium to long hop bitterness that doesn't linger harshly"
  },
  "German Pilsner": {
    appearance: "Straw to light gold color, brilliant clarity, dense white head",
    aroma: "Moderate to moderately-high floral or spicy hop aroma",
    mouthfeel: "Medium-light body with high carbonation, crisp and dry",
    flavour: "Clean, crisp with moderate hop bitterness and light malt sweetness",
    follow: "Dry finish with lingering hop bitterness"
  },
  "Imperial Stout": {
    appearance: "Very dark brown to black, thick tan head, opaque",
    aroma: "Rich roasted malt, chocolate, coffee, often with alcohol warmth",
    mouthfeel: "Full to very full body, smooth, alcohol warmth present",
    flavour: "Intense roasted, burnt, chocolate flavors with supporting hop bitterness",
    follow: "Long, complex finish with roasted character"
  },
  "Belgian Witbier": {
    appearance: "Very pale straw to light gold, cloudy, thick white head",
    aroma: "Sweet malty aroma with coriander and orange peel spicing",
    mouthfeel: "Medium-light body with high carbonation, smooth texture",
    flavour: "Pleasant malty sweetness with herbal, spicy character",
    follow: "Dry, herbal finish with subtle spice notes"
  },
  "English Porter": {
    appearance: "Light brown to dark brown, good clarity, tan head",
    aroma: "Moderate to moderately low bready, biscuity malt aroma",
    mouthfeel: "Medium-light to medium body with moderate carbonation",
    flavour: "Moderate bready malt flavor with restrained roasty character",
    follow: "Dry to semi-sweet finish"
  },
  "Saison": {
    appearance: "Pale orange to deep gold, good clarity, dense white head",
    aroma: "Fruity, spicy, hop and malt complexity",
    mouthfeel: "Medium-light to medium body, high carbonation",
    flavour: "Medium-low to medium-high spicy or fruity yeast-derived flavors",
    follow: "Dry finish with spicy, hoppy, and yeast character"
  }
};

export const bonusAttributeCategories = {
  emotionalImpact: {
    name: 'Emotional Impact',
    positive: [
      { id: 'memorable', name: 'Memorable', weight: 0.3 },
      { id: 'comforting', name: 'Comforting', weight: 0.2 },
      { id: 'exciting', name: 'Exciting', weight: 0.4 },
      { id: 'nostalgic', name: 'Nostalgic', weight: 0.2 },
      { id: 'uplifting', name: 'Uplifting', weight: 0.3 }
    ],
    negative: [
      { id: 'disappointing', name: 'Disappointing', weight: -0.4 },
      { id: 'boring', name: 'Boring', weight: -0.3 },
      { id: 'unpleasant', name: 'Unpleasant', weight: -0.5 },
      { id: 'forgettable', name: 'Forgettable', weight: -0.2 }
    ]
  },
  technicalExcellence: {
    name: 'Technical Excellence',
    positive: [
      { id: 'wellCrafted', name: 'Well-crafted', weight: 0.5 },
      { id: 'balanced', name: 'Balanced', weight: 0.4 },
      { id: 'complex', name: 'Complex', weight: 0.6 },
      { id: 'clean', name: 'Clean', weight: 0.3 },
      { id: 'innovative', name: 'Innovative', weight: 0.7 }
    ],
    negative: [
      { id: 'flawed', name: 'Flawed', weight: -0.6 },
      { id: 'unbalanced', name: 'Unbalanced', weight: -0.4 },
      { id: 'harsh', name: 'Harsh', weight: -0.5 },
      { id: 'muddy', name: 'Muddy', weight: -0.3 }
    ]
  },
  styleAccuracy: {
    name: 'Style Accuracy',
    positive: [
      { id: 'exemplary', name: 'Exemplary Example', weight: 0.6 },
      { id: 'authentic', name: 'Authentic', weight: 0.4 },
      { id: 'traditional', name: 'Traditional', weight: 0.3 }
    ],
    negative: [
      { id: 'offStyle', name: 'Off-style', weight: -0.5 },
      { id: 'misrepresented', name: 'Misrepresented', weight: -0.4 }
    ]
  },
  contextual: {
    name: 'Contextual Factors',
    positive: [
      { id: 'valueForMoney', name: 'Great Value', weight: 0.2 },
      { id: 'availability', name: 'Easy to Find', weight: 0.1 },
      { id: 'packaging', name: 'Great Packaging', weight: 0.1 },
      { id: 'seasonal', name: 'Perfect for Season', weight: 0.2 }
    ],
    negative: [
      { id: 'overpriced', name: 'Overpriced', weight: -0.3 },
      { id: 'hardToFind', name: 'Hard to Find', weight: -0.1 },
      { id: 'poorPackaging', name: 'Poor Packaging', weight: -0.1 }
    ]
  }
};

export const burpScale = {
  0: { label: 'None', description: 'No burp or gas release' },
  1: { label: 'Light', description: 'Gentle, subtle gas release' },
  2: { label: 'Moderate', description: 'Noticeable, satisfying burp' },
  3: { label: 'Strong', description: 'Robust, full-bodied burp with character' }
};