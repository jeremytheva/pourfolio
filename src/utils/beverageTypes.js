// Beverage type definitions with unique attributes
export const beverageTypes = {
  beer: {
    name: 'Beer',
    icon: '🍺',
    attributes: [
      'appearance',
      'aroma', 
      'mouthfeel',
      'flavour',
      'follow',
      'design'
    ],
    defaultWeights: {
      appearance: 1.5,
      aroma: 3.0,
      mouthfeel: 3.0,
      flavour: 4.5,
      follow: 2.5,
      design: 0
    },
    maxWeightSum: 15,
    servingStyles: ['Draft', 'Bottle', 'Can', 'Taster', 'Cask', 'Crowler', 'Growler', 'Side Pull']
  },
  wine: {
    name: 'Wine',
    icon: '🍷',
    attributes: [
      'appearance',
      'aroma',
      'taste',
      'balance',
      'finish',
      'design'
    ],
    defaultWeights: {
      appearance: 1.0,
      aroma: 3.5,
      taste: 4.5,
      balance: 3.0,
      finish: 3.0,
      design: 0
    },
    maxWeightSum: 15,
    servingStyles: ['Bottle', 'Glass', 'Decanter', 'Magnum', 'Half Bottle']
  },
  spirits: {
    name: 'Spirits',
    icon: '🥃',
    attributes: [
      'appearance',
      'nose',
      'palate',
      'complexity',
      'finish',
      'design'
    ],
    defaultWeights: {
      appearance: 0.5,
      nose: 4.0,
      palate: 4.5,
      complexity: 3.0,
      finish: 3.0,
      design: 0
    },
    maxWeightSum: 15,
    servingStyles: ['Neat', 'On the Rocks', 'With Water', 'Cocktail', 'Shot', 'Taster']
  },
  cider: {
    name: 'Cider',
    icon: '🍎',
    attributes: [
      'appearance',
      'aroma',
      'sweetness',
      'acidity',
      'finish',
      'design'
    ],
    defaultWeights: {
      appearance: 1.0,
      aroma: 2.5,
      sweetness: 3.5,
      acidity: 4.0,
      finish: 4.0,
      design: 0
    },
    maxWeightSum: 15,
    servingStyles: ['Draft', 'Bottle', 'Can', 'Crowler', 'Growler', 'Cask']
  },
  mead: {
    name: 'Mead',
    icon: '🍯',
    attributes: [
      'appearance',
      'aroma',
      'honey_character',
      'balance',
      'finish',
      'design'
    ],
    defaultWeights: {
      appearance: 1.0,
      aroma: 3.0,
      honey_character: 4.5,
      balance: 3.5,
      finish: 3.0,
      design: 0
    },
    maxWeightSum: 15,
    servingStyles: ['Bottle', 'Glass', 'Goblet', 'Horn', 'Taster']
  },
  fermented: {
    name: 'Fermented Beverages',
    icon: '🫖',
    attributes: [
      'appearance',
      'aroma',
      'fermentation_character',
      'balance',
      'finish',
      'design'
    ],
    defaultWeights: {
      appearance: 1.0,
      aroma: 2.5,
      fermentation_character: 4.5,
      balance: 4.0,
      finish: 3.0,
      design: 0
    },
    maxWeightSum: 15,
    servingStyles: ['Bottle', 'Can', 'Glass', 'Growler', 'Draft']
  }
};

export const attributeLabels = {
  // Common attributes
  appearance: 'Appearance',
  aroma: 'Aroma', 
  finish: 'Finish',
  design: 'Package Design',
  
  // Beer attributes
  mouthfeel: 'Mouthfeel',
  flavour: 'Flavour',
  follow: 'Follow (Finish)',
  
  // Wine attributes
  taste: 'Taste',
  balance: 'Balance',
  
  // Spirits attributes
  nose: 'Nose',
  palate: 'Palate',
  complexity: 'Complexity',
  
  // Cider attributes
  sweetness: 'Sweetness',
  acidity: 'Acidity',
  
  // Mead attributes
  honey_character: 'Honey Character',
  
  // Fermented beverages
  fermentation_character: 'Fermentation Character'
};

export const ratingDescriptors = {
  // Beer descriptors
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
  },
  design: {
    1: "Terrible Design",
    2: "Poor Design",
    3: "Average Design",
    4: "Good Design",
    5: "Great Design",
    6: "Beautiful Design", 
    7: "Stunning Design"
  },
  
  // Wine descriptors
  taste: {
    1: "Unpalatable",
    2: "Poor Taste",
    3: "Average Taste",
    4: "Good Taste",
    5: "Excellent Taste",
    6: "Outstanding",
    7: "Exceptional"
  },
  balance: {
    1: "Severely Unbalanced",
    2: "Poor Balance",
    3: "Acceptable Balance",
    4: "Well Balanced",
    5: "Excellent Balance",
    6: "Perfect Harmony",
    7: "Transcendent"
  },
  finish: {
    1: "Abrupt/Harsh",
    2: "Short/Weak", 
    3: "Average Length",
    4: "Good Finish",
    5: "Long & Pleasant",
    6: "Exceptional Length",
    7: "Eternal Perfection"
  },
  
  // Spirits descriptors
  nose: {
    1: "Off-putting",
    2: "Weak/Harsh",
    3: "Average Nose",
    4: "Pleasant",
    5: "Complex & Rich",
    6: "Exceptional",
    7: "Mind-blowing"
  },
  palate: {
    1: "Harsh/Unpleasant",
    2: "Poor Delivery",
    3: "Average Palate",
    4: "Good Flavors",
    5: "Rich & Complex",
    6: "Outstanding", 
    7: "Perfect Expression"
  },
  complexity: {
    1: "One-dimensional",
    2: "Simple",
    3: "Average Complexity",
    4: "Good Layers",
    5: "Very Complex",
    6: "Exceptionally Layered",
    7: "Infinite Complexity"
  },
  
  // Cider descriptors
  sweetness: {
    1: "Cloying/Harsh",
    2: "Poor Balance",
    3: "Average Sweetness",
    4: "Well Balanced",
    5: "Perfect Level",
    6: "Exceptional Balance",
    7: "Ideal Sweetness"
  },
  acidity: {
    1: "Flat/Harsh",
    2: "Poor Acidity",
    3: "Average Tartness",
    4: "Good Brightness",
    5: "Perfect Acidity",
    6: "Exceptional Crispness",
    7: "Ideal Balance"
  },
  
  // Mead descriptors
  honey_character: {
    1: "Absent/Off",
    2: "Weak Honey",
    3: "Average Honey",
    4: "Good Honey Notes",
    5: "Rich Honey Character",
    6: "Exceptional Honey",
    7: "Perfect Honey Expression"
  },
  
  // Fermented beverages descriptors
  fermentation_character: {
    1: "Off/Unpleasant",
    2: "Poor Fermentation",
    3: "Average Character",
    4: "Good Fermentation",
    5: "Excellent Character",
    6: "Outstanding",
    7: "Perfect Fermentation"
  }
};

export const styleGuidance = {
  // Beer styles
  "American IPA": {
    appearance: "Expect pale gold to amber color with good clarity and persistent white head",
    aroma: "Prominent hop aroma of citrus, pine, or floral notes with supporting malt sweetness", 
    mouthfeel: "Medium-light to medium body with moderate to high carbonation",
    flavour: "Strong hop flavor balanced by caramel malt sweetness, clean fermentation",
    follow: "Medium to long hop bitterness that doesn't linger harshly",
    design: "Modern, bold artwork often featuring hop imagery or craft aesthetic"
  },
  "German Pilsner": {
    appearance: "Straw to light gold color, brilliant clarity, dense white head",
    aroma: "Moderate to moderately-high floral or spicy hop aroma",
    mouthfeel: "Medium-light body with high carbonation, crisp and dry",
    flavour: "Clean, crisp with moderate hop bitterness and light malt sweetness", 
    follow: "Dry finish with lingering hop bitterness",
    design: "Traditional German styling, often with classic fonts and heraldic elements"
  },
  
  // Wine styles
  "Chardonnay": {
    appearance: "Pale to medium gold, clear and brilliant",
    aroma: "Citrus, apple, tropical fruits, possible oak and butter notes",
    taste: "Crisp acidity with fruit flavors, possible oak and malolactic complexity",
    balance: "Fruit, acidity, and oak (if used) in harmony",
    finish: "Clean, refreshing with fruit and mineral notes",
    design: "Elegant labeling often featuring vineyard imagery or classic typography"
  },
  "Cabernet Sauvignon": {
    appearance: "Deep ruby to purple color, good clarity", 
    aroma: "Blackcurrant, cedar, tobacco, possible oak and spice",
    taste: "Full-bodied with dark fruit, tannins, and complexity",
    balance: "Fruit, tannins, acidity, and alcohol in harmony",
    finish: "Long, complex with fruit and oak notes",
    design: "Rich, sophisticated labeling often with estate imagery or coat of arms"
  },
  
  // Spirits styles
  "Single Malt Scotch": {
    appearance: "Golden amber to deep copper, clear and bright",
    nose: "Malt, honey, fruit, possible peat and oak complexity",
    palate: "Rich malt character with regional characteristics", 
    complexity: "Layered flavors developing over time",
    finish: "Long, warming with malt and oak notes",
    design: "Traditional Scottish imagery, often featuring distillery heritage and landscapes"
  },
  "Bourbon": {
    appearance: "Amber to deep copper from barrel aging",
    nose: "Corn sweetness, vanilla, caramel, oak spices",
    palate: "Sweet corn, vanilla, caramel with oak influence",
    complexity: "Multiple layers of grain and barrel character",
    finish: "Warm, spicy with lingering sweetness",
    design: "American heritage styling with bourbon barrel and grain imagery"
  },
  
  // Cider styles
  "Traditional Cider": {
    appearance: "Pale to golden yellow, clear to slightly hazy",
    aroma: "Fresh apple character, possibly floral or fruity",
    sweetness: "Dry to off-dry, clean apple flavors",
    acidity: "Crisp, refreshing acidity balancing sweetness",
    finish: "Clean, crisp with lingering apple notes",
    design: "Rustic, orchard-inspired imagery with apple and farm themes"
  },
  "Traditional English Cider": {
    appearance: "Golden to amber, may have some haze",
    aroma: "Rich apple character with earthy undertones",
    sweetness: "Medium-dry with complex apple flavors",
    acidity: "Balanced acidity supporting fruit character", 
    finish: "Medium length with apple and earth notes",
    design: "Traditional English countryside imagery with heritage elements"
  },
  
  // Mead styles
  "Traditional Mead": {
    appearance: "Pale gold to deep amber, clear and bright",
    aroma: "Honey character dominant with floral notes",
    honey_character: "Rich, complex honey flavors as primary character",
    balance: "Honey sweetness balanced by alcohol and acidity",
    finish: "Smooth, warming with lingering honey notes",
    design: "Ancient or medieval imagery with honeycomb and bee motifs"
  },
  
  // Fermented beverage styles
  "Kombucha": {
    appearance: "Pale to amber, may have slight cloudiness",
    aroma: "Tangy, acidic with tea and fruit notes",
    fermentation_character: "Bright acidity with complex fermentation flavors",
    balance: "Tartness balanced by sweetness and tea character",
    finish: "Clean, refreshing with lingering acidity",
    design: "Modern, health-focused design with vibrant colors and wellness imagery"
  },
  "Ginger Kombucha": {
    appearance: "Golden to amber with possible cloudiness",
    aroma: "Spicy ginger with tangy fermentation notes", 
    fermentation_character: "Complex fermentation with prominent ginger spice",
    balance: "Ginger heat balanced by acidity and sweetness",
    finish: "Warming ginger finish with clean acidity",
    design: "Energetic design featuring ginger root and spice imagery"
  }
};

export const getBeverageTypeFromCategory = (category) => {
  const categoryMap = {
    'beer': 'beer',
    'wine': 'wine', 
    'spirits': 'spirits',
    'whiskey': 'spirits',
    'vodka': 'spirits',
    'gin': 'spirits',
    'rum': 'spirits',
    'tequila': 'spirits',
    'cider': 'cider',
    'mead': 'mead',
    'kombucha': 'fermented',
    'kefir': 'fermented',
    'tepache': 'fermented',
    'jun': 'fermented'
  };
  
  return categoryMap[category.toLowerCase()] || 'beer';
};

export const beverageSubtypes = {
  beer: ['IPA', 'Lager', 'Stout', 'Porter', 'Wheat Beer', 'Saison', 'Pilsner', 'Ale'],
  wine: ['Red Wine', 'White Wine', 'Rosé', 'Sparkling Wine', 'Dessert Wine', 'Fortified Wine'],
  spirits: ['Whiskey', 'Vodka', 'Gin', 'Rum', 'Tequila', 'Brandy', 'Liqueur'],
  cider: ['Traditional Cider', 'Fruit Cider', 'Dry Cider', 'Sweet Cider', 'Sparkling Cider'],
  mead: ['Traditional Mead', 'Fruit Mead', 'Spiced Mead', 'Sparkling Mead'],
  fermented: ['Kombucha', 'Water Kefir', 'Milk Kefir', 'Tepache', 'Jun', 'Kvass']
};