import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiSearch, FiExternalLink, FiBook, FiFilter } = FiIcons;

function StyleGuide() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Dummy beer styles data - in a real app, this would come from API
  const beerStyles = [
    {
      id: 1,
      name: 'American IPA',
      category: 'IPA',
      description: 'A decidedly hoppy and bitter, moderately strong American pale ale, showcasing modern American or New World hop varieties.',
      bjcpLink: 'https://www.bjcp.org/bjcp-style-guidelines/',
      baLink: 'https://www.brewersassociation.org/resources/brewers-association-beer-style-guidelines/',
      characteristics: {
        abv: '5.5-7.5%',
        ibu: '40-70',
        srm: '6-14'
      },
      examples: ['Stone IPA', 'Bell\'s Two Hearted Ale', 'Russian River Blind Pig']
    },
    {
      id: 2,
      name: 'German Pilsner',
      category: 'Pilsner',
      description: 'A light-bodied, highly-attenuated, gold-colored, bottom-fermented bitter German beer showing excellent head retention.',
      bjcpLink: 'https://www.bjcp.org/bjcp-style-guidelines/',
      baLink: 'https://www.brewersassociation.org/resources/brewers-association-beer-style-guidelines/',
      characteristics: {
        abv: '4.4-5.2%',
        ibu: '25-45',
        srm: '2-5'
      },
      examples: ['Bitburger', 'Warsteiner', 'Trumer Pils']
    },
    {
      id: 3,
      name: 'Imperial Stout',
      category: 'Stout',
      description: 'An intensely-flavored, big, dark ale with a wide range of flavor balances and regional interpretations.',
      bjcpLink: 'https://www.bjcp.org/bjcp-style-guidelines/',
      baLink: 'https://www.brewersassociation.org/resources/brewers-association-beer-style-guidelines/',
      characteristics: {
        abv: '8.0-12.0%',
        ibu: '50-90',
        srm: '30-40+'
      },
      examples: ['Old Rasputin', 'Founders Imperial Stout', 'Bell\'s Expedition Stout']
    },
    {
      id: 4,
      name: 'Belgian Witbier',
      category: 'Wheat Beer',
      description: 'A refreshing, elegant, tasty, moderate-strength wheat-based ale.',
      bjcpLink: 'https://www.bjcp.org/bjcp-style-guidelines/',
      baLink: 'https://www.brewersassociation.org/resources/brewers-association-beer-style-guidelines/',
      characteristics: {
        abv: '4.5-5.5%',
        ibu: '8-17',
        srm: '2-4'
      },
      examples: ['Hoegaarden', 'Blue Moon', 'Allagash White']
    },
    {
      id: 5,
      name: 'English Porter',
      category: 'Porter',
      description: 'A moderate-strength brown beer with a restrained roasty character and bitterness.',
      bjcpLink: 'https://www.bjcp.org/bjcp-style-guidelines/',
      baLink: 'https://www.brewersassociation.org/resources/brewers-association-beer-style-guidelines/',
      characteristics: {
        abv: '4.0-5.4%',
        ibu: '18-35',
        srm: '20-30'
      },
      examples: ['Fuller\'s London Porter', 'Samuel Smith Taddy Porter', 'Anchor Porter']
    },
    {
      id: 6,
      name: 'Saison',
      category: 'Farmhouse Ale',
      description: 'Most commonly, a pale, refreshing, highly-attenuated, moderately-bitter, moderate-strength Belgian ale.',
      bjcpLink: 'https://www.bjcp.org/bjcp-style-guidelines/',
      baLink: 'https://www.brewersassociation.org/resources/brewers-association-beer-style-guidelines/',
      characteristics: {
        abv: '3.5-9.5%',
        ibu: '20-35',
        srm: '5-14'
      },
      examples: ['Saison Dupont', 'Boulevard Tank 7', 'Ommegang Hennepin']
    }
  ];

  // Get unique categories
  const categories = [...new Set(beerStyles.map(style => style.category))];

  // Filter styles
  const filteredStyles = beerStyles.filter(style => {
    const matchesSearch = style.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         style.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || style.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Beer Style Guidelines</h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Explore comprehensive information about beer styles based on BJCP 2021 and Brewers Association 2024 guidelines.
          Learn about the characteristics, history, and examples of each style.
        </p>
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
              placeholder="Search beer styles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
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
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">ABV</div>
                  <div className="font-semibold text-gray-800">{style.characteristics.abv}</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">IBU</div>
                  <div className="font-semibold text-gray-800">{style.characteristics.ibu}</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">SRM</div>
                  <div className="font-semibold text-gray-800">{style.characteristics.srm}</div>
                </div>
              </div>

              {/* Examples */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Commercial Examples</h4>
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

              {/* Guidelines Links */}
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={style.bjcpLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  <SafeIcon icon={FiBook} className="w-4 h-4" />
                  <span>BJCP 2021</span>
                  <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
                </a>
                <a
                  href={style.baLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  <SafeIcon icon={FiBook} className="w-4 h-4" />
                  <span>BA 2024</span>
                  <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
                </a>
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
        <h3 className="text-lg font-semibold text-amber-800 mb-2">About the Guidelines</h3>
        <p className="text-amber-700 max-w-3xl mx-auto">
          The Beer Judge Certification Program (BJCP) and Brewers Association (BA) provide comprehensive 
          style guidelines that help brewers, judges, and beer enthusiasts understand the characteristics 
          that define different beer styles. These guidelines serve as the foundation for beer competitions 
          and quality assessment worldwide.
        </p>
      </motion.div>
    </div>
  );
}

export default StyleGuide;