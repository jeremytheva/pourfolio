import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import BeverageTypeSelector from '../components/BeverageTypeSelector';
import { beverageTypes } from '../utils/beverageTypes';

const { FiSearch, FiExternalLink, FiBook, FiFilter } = FiIcons;

function StyleGuide({ selectedBeverageCategory = 'beer' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBeverageType, setSelectedBeverageType] = useState(selectedBeverageCategory);

  const currentBeverage = beverageTypes[selectedBeverageType] || beverageTypes.beer;

  // Comprehensive style data for all beverage types
  const allStyles = {
    beer: [
      {
        id: 1,
        name: 'American IPA',
        category: 'IPA',
        description: 'A decidedly hoppy and bitter, moderately strong American pale ale, showcasing modern American or New World hop varieties.',
        bjcpLink: 'https://www.bjcp.org/bjcp-style-guidelines/',
        baLink: 'https://www.brewersassociation.org/resources/brewers-association-beer-style-guidelines/',
        characteristics: { abv: '5.5-7.5%', ibu: '40-70', srm: '6-14' },
        examples: ['Stone IPA', 'Bell\'s Two Hearted Ale', 'Russian River Blind Pig']
      },
      {
        id: 2,
        name: 'German Pilsner',
        category: 'Pilsner',
        description: 'A light-bodied, highly-attenuated, gold-colored, bottom-fermented bitter German beer showing excellent head retention.',
        bjcpLink: 'https://www.bjcp.org/bjcp-style-guidelines/',
        baLink: 'https://www.brewersassociation.org/resources/brewers-association-beer-style-guidelines/',
        characteristics: { abv: '4.4-5.2%', ibu: '25-45', srm: '2-5' },
        examples: ['Bitburger', 'Warsteiner', 'Trumer Pils']
      },
      {
        id: 3,
        name: 'Imperial Stout',
        category: 'Stout',
        description: 'An intensely-flavored, big, dark ale with a wide range of flavor balances and regional interpretations.',
        bjcpLink: 'https://www.bjcp.org/bjcp-style-guidelines/',
        baLink: 'https://www.brewersassociation.org/resources/brewers-association-beer-style-guidelines/',
        characteristics: { abv: '8.0-12.0%', ibu: '50-90', srm: '30-40+' },
        examples: ['Old Rasputin', 'Founders Imperial Stout', 'Bell\'s Expedition Stout']
      },
      {
        id: 4,
        name: 'Belgian Witbier',
        category: 'Wheat Beer',
        description: 'A refreshing, elegant, tasty, moderate-strength wheat-based ale.',
        bjcpLink: 'https://www.bjcp.org/bjcp-style-guidelines/',
        baLink: 'https://www.brewersassociation.org/resources/brewers-association-beer-style-guidelines/',
        characteristics: { abv: '4.5-5.5%', ibu: '8-17', srm: '2-4' },
        examples: ['Hoegaarden', 'Blue Moon', 'Allagash White']
      },
      {
        id: 5,
        name: 'English Porter',
        category: 'Porter',
        description: 'A moderate-strength brown beer with a restrained roasty character and bitterness.',
        bjcpLink: 'https://www.bjcp.org/bjcp-style-guidelines/',
        baLink: 'https://www.brewersassociation.org/resources/brewers-association-beer-style-guidelines/',
        characteristics: { abv: '4.0-5.4%', ibu: '18-35', srm: '20-30' },
        examples: ['Fuller\'s London Porter', 'Samuel Smith Taddy Porter', 'Anchor Porter']
      },
      {
        id: 6,
        name: 'Saison',
        category: 'Farmhouse Ale',
        description: 'Most commonly, a pale, refreshing, highly-attenuated, moderately-bitter, moderate-strength Belgian ale.',
        bjcpLink: 'https://www.bjcp.org/bjcp-style-guidelines/',
        baLink: 'https://www.brewersassociation.org/resources/brewers-association-beer-style-guidelines/',
        characteristics: { abv: '3.5-9.5%', ibu: '20-35', srm: '5-14' },
        examples: ['Saison Dupont', 'Boulevard Tank 7', 'Ommegang Hennepin']
      }
    ],
    wine: [
      {
        id: 1,
        name: 'Chardonnay',
        category: 'White Wine',
        description: 'A full-bodied white wine with rich texture, often featuring oak aging and malolactic fermentation.',
        wineSpectatorsLink: 'https://www.winespectator.com/wine-basics/wine-styles',
        wineFollyLink: 'https://winefolly.com/deep-dive/wine-characteristics/',
        characteristics: { abv: '13-15%', acidity: 'Medium', body: 'Full', tannins: 'None' },
        examples: ['Kendall-Jackson Vintner\'s Reserve', 'Chateau Montelena', 'Rombauer Carneros']
      },
      {
        id: 2,
        name: 'Cabernet Sauvignon',
        category: 'Red Wine',
        description: 'A full-bodied red wine with high tannins, deep color, and complex flavors of dark fruits.',
        wineSpectatorsLink: 'https://www.winespectator.com/wine-basics/wine-styles',
        wineFollyLink: 'https://winefolly.com/deep-dive/wine-characteristics/',
        characteristics: { abv: '13.5-15%', acidity: 'Medium+', body: 'Full', tannins: 'High' },
        examples: ['Caymus Napa Valley', 'Silver Oak Alexander Valley', 'Opus One']
      },
      {
        id: 3,
        name: 'Pinot Noir',
        category: 'Red Wine',
        description: 'An elegant, light to medium-bodied red wine with complex aromas and flavors, low tannins.',
        wineSpectatorsLink: 'https://www.winespectator.com/wine-basics/wine-styles',
        wineFollyLink: 'https://winefolly.com/deep-dive/wine-characteristics/',
        characteristics: { abv: '12-14%', acidity: 'High', body: 'Light-Medium', tannins: 'Low-Medium' },
        examples: ['Willamette Valley Vineyards', 'Domaine Drouhin', 'La Crema Sonoma Coast']
      },
      {
        id: 4,
        name: 'Sauvignon Blanc',
        category: 'White Wine',
        description: 'A crisp, dry white wine with high acidity and herbaceous, citrusy flavors.',
        wineSpectatorsLink: 'https://www.winespectator.com/wine-basics/wine-styles',
        wineFollyLink: 'https://winefolly.com/deep-dive/wine-characteristics/',
        characteristics: { abv: '12-14%', acidity: 'High', body: 'Light-Medium', tannins: 'None' },
        examples: ['Oyster Bay', 'Cloudy Bay', 'Duckhorn Napa Valley']
      },
      {
        id: 5,
        name: 'Champagne',
        category: 'Sparkling Wine',
        description: 'Traditional method sparkling wine from the Champagne region, with complex yeast character.',
        wineSpectatorsLink: 'https://www.winespectator.com/wine-basics/wine-styles',
        wineFollyLink: 'https://winefolly.com/deep-dive/wine-characteristics/',
        characteristics: { abv: '12-12.5%', acidity: 'High', body: 'Light-Medium', bubbles: 'Fine' },
        examples: ['Dom Pérignon', 'Krug Grande Cuvée', 'Pol Roger']
      },
      {
        id: 6,
        name: 'Riesling',
        category: 'White Wine',
        description: 'An aromatic white wine ranging from bone dry to very sweet, with high acidity and floral notes.',
        wineSpectatorsLink: 'https://www.winespectator.com/wine-basics/wine-styles',
        wineFollyLink: 'https://winefolly.com/deep-dive/wine-characteristics/',
        characteristics: { abv: '8-13%', acidity: 'High', body: 'Light-Medium', sweetness: 'Varies' },
        examples: ['Dr. Loosen', 'Chateau Ste. Michelle', 'Trimbach']
      }
    ],
    spirits: [
      {
        id: 1,
        name: 'Single Malt Scotch Whisky',
        category: 'Whisky',
        description: 'Whisky made from malted barley at a single distillery in Scotland, aged in oak casks for minimum 3 years.',
        swaLink: 'https://www.scotch-whisky.org.uk/',
        masterOfMaltLink: 'https://www.masterofmalt.com/whiskies/scotch-whisky/',
        characteristics: { abv: '40-60%', aging: '3+ years', cask: 'Oak', region: 'Scotland' },
        examples: ['Macallan 18', 'Lagavulin 16', 'Glenfiddich 21']
      },
      {
        id: 2,
        name: 'Bourbon Whiskey',
        category: 'Whiskey',
        description: 'American whiskey made from at least 51% corn mash, aged in new charred oak containers.',
        kbaLink: 'https://kybourbontrail.com/',
        whiskeyWashLink: 'https://thewhiskeywash.com/',
        characteristics: { abv: '40-50%', mash: '51%+ Corn', aging: '2+ years', cask: 'New Charred Oak' },
        examples: ['Pappy Van Winkle', 'Buffalo Trace', 'Maker\'s Mark']
      },
      {
        id: 3,
        name: 'London Dry Gin',
        category: 'Gin',
        description: 'A dry style of gin with predominant juniper flavor, distilled with botanicals.',
        ginFoundryLink: 'https://www.theginfoundry.com/',
        ginGuideLink: 'https://www.diffordsguide.com/encyclopedia/gin',
        characteristics: { abv: '37.5%+', juniper: 'Dominant', botanicals: 'Various', sweetness: 'Dry' },
        examples: ['Tanqueray', 'Bombay Sapphire', 'Hendrick\'s']
      },
      {
        id: 4,
        name: 'Aged Rum',
        category: 'Rum',
        description: 'Rum aged in oak barrels, developing complex flavors and darker color over time.',
        rumGuruLink: 'https://rumguru.com/',
        gotRumLink: 'https://gotrum.com/',
        characteristics: { abv: '40-50%', aging: '3+ years', base: 'Sugarcane', color: 'Golden-Dark' },
        examples: ['Zacapa 23', 'Appleton Estate 21', 'Mount Gay XO']
      },
      {
        id: 5,
        name: 'Blanco Tequila',
        category: 'Tequila',
        description: 'Unaged tequila made from 100% blue agave, bottled immediately or aged less than 2 months.',
        crtLink: 'https://www.crt.org.mx/',
        tequilaMatchmakerLink: 'https://www.tequilamatchmaker.com/',
        characteristics: { abv: '38-55%', agave: '100% Blue Agave', aging: 'None-2 months', profile: 'Pure Agave' },
        examples: ['Clase Azul Plata', 'Don Julio Blanco', 'Patrón Silver']
      },
      {
        id: 6,
        name: 'Cognac VSOP',
        category: 'Brandy',
        description: 'Premium grape brandy from Cognac, France, aged minimum 4 years with complex fruit and oak notes.',
        cognacExpertLink: 'https://www.cognac-expert.com/',
        bnicLink: 'https://www.cognac.fr/',
        characteristics: { abv: '40%', aging: '4+ years', grapes: 'Ugni Blanc', region: 'Cognac, France' },
        examples: ['Hennessy VSOP', 'Rémy Martin VSOP', 'Martell VSOP']
      }
    ],
    cider: [
      {
        id: 1,
        name: 'Traditional English Cider',
        category: 'Traditional Cider',
        description: 'Dry, still cider made from traditional English cider apples with earthy, complex flavors.',
        camraLink: 'https://camra.org.uk/learn-discover/cider/',
        ciderReviewLink: 'https://ciderreview.com/',
        characteristics: { abv: '6-8.5%', sweetness: 'Dry', carbonation: 'Still', apples: 'Traditional Varieties' },
        examples: ['Aspall Dry Cyder', 'Westons Old Rosie', 'Thatchers Traditional']
      },
      {
        id: 2,
        name: 'New England Cider',
        category: 'American Cider',
        description: 'Modern American cider often featuring dessert apples with clean, crisp character.',
        americanCiderLink: 'https://ciderassociation.org/',
        ciderCraftLink: 'https://cidercraft.com/',
        characteristics: { abv: '4.5-7%', sweetness: 'Off-dry to Dry', carbonation: 'Sparkling', apples: 'Dessert Varieties' },
        examples: ['Downeast Original', 'Angry Orchard Crisp Apple', 'Woodchuck Amber']
      },
      {
        id: 3,
        name: 'French Cidre',
        category: 'European Cider',
        description: 'Traditional French cider with lower alcohol, natural carbonation, and complex apple character.',
        cidreDeNormandieLink: 'https://www.calvados-aoc.com/',
        frenchCiderLink: 'https://www.cidrefrance.com/',
        characteristics: { abv: '2-4%', sweetness: 'Off-dry', carbonation: 'Natural', tradition: 'Keeving Method' },
        examples: ['Eric Bordelet', 'Dupont Cidre', 'Kerisac']
      },
      {
        id: 4,
        name: 'Perry (Pear Cider)',
        category: 'Fruit Cider',
        description: 'Fermented pear beverage with delicate, floral character and crisp finish.',
        perryGuideLink: 'https://www.perry.org.uk/',
        threeCCountiesLink: 'https://www.threecountiesciderroute.co.uk/',
        characteristics: { abv: '4-8%', fruit: '100% Pears', sweetness: 'Dry to Off-dry', character: 'Delicate' },
        examples: ['Oliver\'s Perry', 'Hogan\'s Vintage Perry', 'Gwatkin Perry']
      },
      {
        id: 5,
        name: 'Hopped Cider',
        category: 'Specialty Cider',
        description: 'Cider with added hops for bitterness and aroma, bridging cider and beer worlds.',
        hoppedCiderLink: 'https://www.ciderculture.com/',
        ciderSceneLink: 'https://ciderscene.com/',
        characteristics: { abv: '5-7%', hops: 'Present', bitterness: 'Moderate', innovation: 'Modern Style' },
        examples: ['Citizen Cider Dirty Mayor', 'Austin Eastciders Hopped', 'Bold Rock IPA Cider']
      },
      {
        id: 6,
        name: 'Ice Cider',
        category: 'Dessert Cider',
        description: 'Sweet dessert cider made from concentrated apple juice, similar to ice wine production.',
        iceCiderLink: 'https://www.icecider.org/',
        quebecCiderLink: 'https://www.cidreduquebec.com/',
        characteristics: { abv: '7-13%', sweetness: 'Sweet', production: 'Concentrated Juice', style: 'Dessert' },
        examples: ['Eden Heirloom Ice Cider', 'Domaine Neige', 'La Face Cachée de la Pomme']
      }
    ],
    mead: [
      {
        id: 1,
        name: 'Traditional Mead',
        category: 'Traditional',
        description: 'Pure honey wine with no additional flavoring, showcasing the character of the honey variety.',
        meadMakersLink: 'https://www.meadmakers.org/',
        americanMeadLink: 'https://www.americanmeadmakers.org/',
        characteristics: { abv: '8-18%', honey: 'Pure Honey', additives: 'None', character: 'Honey Forward' },
        examples: ['Superstition Marion', 'Schramm\'s Heart of Darkness', 'Redstone Traditional']
      },
      {
        id: 2,
        name: 'Melomel (Fruit Mead)',
        category: 'Fruit Mead',
        description: 'Mead made with honey and fruit, combining honey sweetness with fruit flavors.',
        gotMeadLink: 'https://www.gotmead.com/',
        meadistLink: 'https://www.meadist.com/',
        characteristics: { abv: '6-16%', honey: 'Primary', fruit: 'Secondary', balance: 'Honey-Fruit' },
        examples: ['Schramm\'s Black Agnes', 'B. Nektar Kill All the Golfers', 'Moonlight Meadery Desire']
      },
      {
        id: 3,
        name: 'Metheglin (Spiced Mead)',
        category: 'Spiced Mead',
        description: 'Mead with added herbs and spices, creating complex aromatic and flavor profiles.',
        spicedMeadLink: 'https://www.spicedmead.com/',
        herbMeadLink: 'https://www.herbalmead.org/',
        characteristics: { abv: '8-18%', honey: 'Base', spices: 'Herbs/Spices', complexity: 'High' },
        examples: ['Moonlight Meadery Kurt\'s Apple Pie', 'Schramm\'s Ginger', 'Brothers Drake Honey']
      },
      {
        id: 4,
        name: 'Cyser (Apple Mead)',
        category: 'Apple Mead',
        description: 'Mead made with honey and apple juice or cider, combining characteristics of both.',
        cyserGuideLink: 'https://www.cyser.org/',
        appleMeadLink: 'https://www.applemead.com/',
        characteristics: { abv: '6-14%', honey: 'Co-primary', apple: 'Co-primary', style: 'Hybrid' },
        examples: ['Schramm\'s The Heart of Darkness', 'Moonlight Meadery Wicked', 'Redstone Sunshine Nectar']
      },
      {
        id: 5,
        name: 'Braggot',
        category: 'Beer-Mead Hybrid',
        description: 'Hybrid beverage combining mead and beer, with both honey and malt character.',
        braggotLink: 'https://www.braggot.org/',
        hybridMeadLink: 'https://www.hybridmead.com/',
        characteristics: { abv: '6-12%', honey: 'Present', malt: 'Present', hops: 'Optional' },
        examples: ['Rabbit\'s Foot Braggot', 'Moonlight Meadery Kurt\'s Apple Pie', 'Wild Blossom Braggot']
      },
      {
        id: 6,
        name: 'Sparkling Mead',
        category: 'Sparkling',
        description: 'Carbonated mead with effervescence, ranging from lightly sparkling to fully sparkling.',
        sparklingMeadLink: 'https://www.sparklingmead.org/',
        bubblyMeadLink: 'https://www.bubblymead.com/',
        characteristics: { abv: '6-16%', carbonation: 'High', honey: 'Primary', texture: 'Effervescent' },
        examples: ['Schramm\'s Sparkling', 'Moonlight Meadery Fizz', 'Redstone Sparkling Nectar']
      }
    ],
    fermented: [
      {
        id: 1,
        name: 'Ginger Kombucha',
        category: 'Kombucha',
        description: 'Fermented tea beverage with ginger, offering probiotics, tartness, and spicy ginger character.',
        kombuchaBrewersLink: 'https://www.kombuchabrewers.org/',
        fermentedFoodsLink: 'https://www.fermentedfoods.org/',
        characteristics: { abv: '0.5-3%', probiotics: 'Live Cultures', acidity: 'Tart', spice: 'Ginger Heat' },
        examples: ['GT\'s Gingerade', 'Health-Ade Ginger-Lemon', 'Brew Dr. Clear Mind']
      },
      {
        id: 2,
        name: 'Water Kefir',
        category: 'Kefir',
        description: 'Probiotic fermented water with kefir grains, light and refreshing with subtle tang.',
        kefirGuideLink: 'https://www.kefirguide.com/',
        waterKefirLink: 'https://www.waterkefir.org/',
        characteristics: { abv: '0.5-2%', probiotics: 'Kefir Grains', sweetness: 'Light', character: 'Clean' },
        examples: ['Live Soda Kombucha', 'Brew Dr. Love', 'Kevita Master Brew']
      },
      {
        id: 3,
        name: 'Tepache',
        category: 'Traditional Fermented',
        description: 'Mexican fermented pineapple beverage with spices, lightly alcoholic and refreshing.',
        tepacheGuideLink: 'https://www.tepache.org/',
        mexicanFermentedLink: 'https://www.mexicanfermented.com/',
        characteristics: { abv: '1-3%', fruit: 'Pineapple', spices: 'Cinnamon/Clove', origin: 'Mexican Traditional' },
        examples: ['Tepache Co. Original', 'De La Calle Tepache', 'Pineapple Collaborative']
      },
      {
        id: 4,
        name: 'Jun',
        category: 'Honey Kombucha',
        description: 'Fermented green tea and honey beverage, similar to kombucha but with honey instead of sugar.',
        junCombuchaLink: 'https://www.junkombucha.com/',
        honeyFermentedLink: 'https://www.honeyfermented.org/',
        characteristics: { abv: '0.5-2%', sweetener: 'Raw Honey', tea: 'Green Tea', character: 'Delicate' },
        examples: ['Flying Embers Jun', 'Wild Tonic Jun', 'Brew Dr. Happiness']
      },
      {
        id: 5,
        name: 'Milk Kefir',
        category: 'Dairy Fermented',
        description: 'Probiotic fermented milk beverage with tangy flavor and creamy texture.',
        milkKefirLink: 'https://www.milkkefir.org/',
        dairyFermentedLink: 'https://www.dairyfermented.com/',
        characteristics: { abv: '0.1-1%', base: 'Milk', probiotics: 'High Count', texture: 'Creamy' },
        examples: ['Lifeway Kefir', 'Maple Hill Organic', 'Green Valley Lactose-Free']
      },
      {
        id: 6,
        name: 'Kvass',
        category: 'Grain Fermented',
        description: 'Traditional Slavic fermented beverage made from bread, with low alcohol and tangy character.',
        kvassGuideLink: 'https://www.kvass.org/',
        breadBeerLink: 'https://www.breadbeer.com/',
        characteristics: { abv: '0.5-1.5%', base: 'Bread/Grain', origin: 'Slavic Traditional', character: 'Tangy' },
        examples: ['Brooklyn Kvass', 'Real Pickles Kvass', 'Fermentary Beet Kvass']
      }
    ]
  };

  // Get styles for current beverage type
  const getStylesForType = (type) => {
    return allStyles[type] || [];
  };

  const currentStyles = getStylesForType(selectedBeverageType);

  // Get unique categories for current beverage type
  const categories = [...new Set(currentStyles.map(style => style.category))];

  // Filter styles
  const filteredStyles = currentStyles.filter(style => {
    const matchesSearch = style.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      style.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || style.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get reference links based on beverage type
  const getReferenceLinks = (style) => {
    switch (selectedBeverageType) {
      case 'beer':
        return [
          { name: 'BJCP 2021', url: style.bjcpLink, icon: FiBook },
          { name: 'BA 2024', url: style.baLink, icon: FiBook }
        ];
      case 'wine':
        return [
          { name: 'Wine Spectator', url: style.wineSpectatorsLink, icon: FiBook },
          { name: 'Wine Folly', url: style.wineFollyLink, icon: FiBook }
        ];
      case 'spirits':
        return Object.entries(style).filter(([key, value]) => 
          key.endsWith('Link') && value
        ).map(([key, url]) => ({
          name: key.replace('Link', '').replace(/([A-Z])/g, ' $1').trim(),
          url,
          icon: FiBook
        }));
      default:
        return Object.entries(style).filter(([key, value]) => 
          key.endsWith('Link') && value
        ).map(([key, url]) => ({
          name: key.replace('Link', '').replace(/([A-Z])/g, ' $1').trim(),
          url,
          icon: FiBook
        }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center space-x-3 mb-4">
          <span className="text-4xl">{currentBeverage.icon}</span>
          <h1 className="text-4xl font-bold text-gray-800">
            {currentBeverage.name} Style Guidelines
          </h1>
        </div>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Explore comprehensive information about {currentBeverage.name.toLowerCase()} styles. 
          Learn about the characteristics, production methods, and examples of each style.
        </p>
      </motion.div>

      {/* Beverage Type Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Beverage Type</h3>
        <BeverageTypeSelector
          selectedType={selectedBeverageType}
          onTypeChange={setSelectedBeverageType}
        />
      </motion.div>

      {/* Search and Filter Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
      >
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${currentBeverage.name.toLowerCase()} styles...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center space-x-2">
              <SafeIcon icon={FiFilter} className="w-5 h-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </motion.div>

      {/* Styles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredStyles.map((style, index) => (
          <motion.div
            key={style.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              {/* Style Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">{style.name}</h3>
                  <span className="inline-block bg-amber-100 text-amber-800 text-sm px-2 py-1 rounded-full">
                    {style.category}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-600 leading-relaxed mb-6">{style.description}</p>

              {/* Characteristics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {Object.entries(style.characteristics).map(([key, value]) => (
                  <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                    <div className="font-semibold text-gray-800 text-sm">{value}</div>
                  </div>
                ))}
              </div>

              {/* Examples */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Examples</h4>
                <div className="flex flex-wrap gap-2">
                  {style.examples.map((example, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-50 text-blue-800 text-xs px-2 py-1 rounded"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </div>

              {/* Reference Links */}
              <div className="flex flex-col sm:flex-row gap-3">
                {getReferenceLinks(style).map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    <SafeIcon icon={link.icon} className="w-4 h-4" />
                    <span>{link.name}</span>
                    <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* No Results */}
      {filteredStyles.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <SafeIcon icon={FiSearch} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No styles found</h3>
          <p className="text-gray-400">Try adjusting your search or filter criteria.</p>
        </motion.div>
      )}

      {/* Footer Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-12 bg-amber-50 rounded-xl p-6 text-center"
      >
        <h3 className="text-lg font-semibold text-amber-800 mb-2">
          About {currentBeverage.name} Guidelines
        </h3>
        <p className="text-amber-700 max-w-3xl mx-auto">
          {selectedBeverageType === 'beer' && 
            'The Beer Judge Certification Program (BJCP) and Brewers Association (BA) provide comprehensive style guidelines that help brewers, judges, and beer enthusiasts understand the characteristics that define different beer styles.'
          }
          {selectedBeverageType === 'wine' && 
            'Wine style guidelines help enthusiasts understand the characteristics, regions, and production methods that define different wine styles. These guidelines serve as references for tasting and evaluation.'
          }
          {selectedBeverageType === 'spirits' && 
            'Spirits guidelines define the production methods, aging requirements, and flavor profiles that distinguish different categories of distilled beverages from around the world.'
          }
          {selectedBeverageType === 'cider' && 
            'Cider style guidelines help identify the apple varieties, production methods, and regional traditions that create the diverse world of fermented apple beverages.'
          }
          {selectedBeverageType === 'mead' && 
            'Mead guidelines define the honey varieties, additional ingredients, and production methods that create the ancient and diverse category of honey wines.'
          }
          {selectedBeverageType === 'fermented' && 
            'Fermented beverage guidelines cover the traditional and modern methods of creating probiotic drinks from various bases including tea, grains, fruits, and dairy.'
          }
        </p>
      </motion.div>
    </div>
  );
}

export default StyleGuide;