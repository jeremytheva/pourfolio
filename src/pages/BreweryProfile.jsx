import React,{useState} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import {motion} from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import BeerCard from '../components/BeerCard';
import SuggestUpdatesModal from '../components/SuggestUpdatesModal';

const {FiArrowLeft,FiMapPin,FiExternalLink,FiFilter,FiEdit3,FiShield}=FiIcons;

function BreweryProfile() {
  const {producerId}=useParams();
  const [searchParams]=useSearchParams();
  const producerType=searchParams.get('type') || 'beer';
  const [filterStyle,setFilterStyle]=useState('all');
  const [sortBy,setSortBy]=useState('name');
  const [showSuggestModal,setShowSuggestModal]=useState(false);

  // Dynamic producer data based on type
  const getProducerData=()=> {
    const producers={
      beer: {
        id: 1,
        name: 'Brewery X',
        type: 'Brewery',
        location: 'Portland,Oregon,USA',
        description: 'Founded in 2010,Brewery X has been crafting exceptional ales and lagers with a focus on innovation and tradition. Our commitment to quality ingredients and sustainable brewing practices has made us a favorite among craft beer enthusiasts.',
        founded: '2010',
        website: 'https://brewery-x.com',
        image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=800&h=400&fit=crop',
        canClaim: true,
        taprooms: [
          {name: 'Main Taproom',address: '123 Brew Street,Portland,OR'},
          {name: 'Downtown Location',address: '456 City Ave,Portland,OR'}
        ]
      },
      wine: {
        id: 11,
        name: 'Valley Vineyard Estate',
        type: 'Winery',
        location: 'Napa Valley,California,USA',
        description: 'Established in 1995,Valley Vineyard Estate has been producing award-winning wines from our estate vineyards. Our commitment to sustainable viticulture and traditional winemaking techniques creates wines of exceptional quality and character.',
        founded: '1995',
        website: 'https://valley-vineyard.com',
        image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&h=400&fit=crop',
        canClaim: true,
        taprooms: [
          {name: 'Estate Tasting Room',address: '789 Vineyard Rd,Napa,CA'},
          {name: 'Downtown Tasting Room',address: '321 Main St,Napa,CA'}
        ]
      },
      spirits: {
        id: 21,
        name: 'Highland Distillery',
        type: 'Distillery',
        location: 'Kentucky,USA',
        description: 'With over 200 years of distilling heritage,Highland Distillery continues the tradition of crafting exceptional bourbon and whiskey. Our master distillers use time-honored methods combined with innovative techniques to create spirits of unparalleled quality.',
        founded: '1820',
        website: 'https://highland-distillery.com',
        image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800&h=400&fit=crop',
        canClaim: true,
        taprooms: [
          {name: 'Distillery Visitor Center',address: '456 Bourbon Trail,Bardstown,KY'},
          {name: 'Louisville Tasting Room',address: '123 Whiskey Row,Louisville,KY'}
        ]
      }
    };

    return producers[producerType] || producers.beer;
  };

  const producer=getProducerData();

  // Dynamic beverages from this producer
  const getProducerBeverages=()=> {
    const beveragesByType={
      beer: [
        {id: 1,name: 'IPA Delight',style: 'India Pale Ale',abv: '6.5%',rating: 4.5,type: 'beer',image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=300&h=300&fit=crop'},
        {id: 2,name: 'Amber Sunset',style: 'Amber Ale',abv: '5.2%',rating: 4.2,type: 'beer',image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=300&h=300&fit=crop'},
        {id: 3,name: 'Dark Porter',style: 'Porter',abv: '6.8%',rating: 4.7,type: 'beer',image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&h=300&fit=crop'},
        {id: 4,name: 'Wheat Wonder',style: 'Wheat Beer',abv: '4.8%',rating: 4.1,type: 'beer',image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=300&h=300&fit=crop'},
        {id: 5,name: 'Seasonal Saison',style: 'Saison',abv: '5.5%',rating: 4.4,type: 'beer',image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=300&h=300&fit=crop'},
        {id: 6,name: 'Imperial Stout',style: 'Imperial Stout',abv: '9.2%',rating: 4.8,type: 'beer',image: 'https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=300&h=300&fit=crop'}
      ],
      wine: [
        {id: 11,name: 'Estate Chardonnay',style: 'Chardonnay',abv: '13.5%',rating: 4.4,type: 'wine',image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=300&h=300&fit=crop'},
        {id: 12,name: 'Reserve Cabernet',style: 'Cabernet Sauvignon',abv: '14.2%',rating: 4.7,type: 'wine',image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&h=300&fit=crop'},
        {id: 13,name: 'Pinot Noir',style: 'Pinot Noir',abv: '13.8%',rating: 4.3,type: 'wine',image: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=300&h=300&fit=crop'},
        {id: 14,name: 'Sparkling Brut',style: 'Sparkling Wine',abv: '12.5%',rating: 4.1,type: 'wine',image: 'https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=300&h=300&fit=crop'}
      ],
      spirits: [
        {id: 21,name: '12-Year Bourbon',style: 'Bourbon',abv: '45%',rating: 4.6,type: 'spirits',image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&h=300&fit=crop'},
        {id: 22,name: '18-Year Single Barrel',style: 'Bourbon',abv: '50%',rating: 4.9,type: 'spirits',image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=300&h=300&fit=crop'},
        {id: 23,name: 'Rye Whiskey',style: 'Rye Whiskey',abv: '47%',rating: 4.4,type: 'spirits',image: 'https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=300&h=300&fit=crop'}
      ]
    };

    return beveragesByType[producerType] || beveragesByType.beer;
  };

  const producerBeverages=getProducerBeverages();

  // Get unique styles for filtering
  const uniqueStyles=[...new Set(producerBeverages.map(beverage=> beverage.style))];

  // Filter and sort beverages
  const filteredBeverages=producerBeverages
    .filter(beverage=> filterStyle==='all' || beverage.style===filterStyle)
    .sort((a,b)=> {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'abv':
          return parseFloat(b.abv) - parseFloat(a.abv);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const handleSuggestUpdates=(updates)=> {
    // Save suggestion for admin approval
    const suggestions=JSON.parse(localStorage.getItem('producerSuggestions') || '[]');
    suggestions.push({
      id: Date.now(),
      producerId: producer.id,
      producerName: producer.name,
      updates,
      submittedBy: 'Current User',
      submittedAt: new Date().toISOString(),
      status: 'pending',
      type: 'producer'
    });
    localStorage.setItem('producerSuggestions',JSON.stringify(suggestions));
    alert('Updates suggested successfully! They will be reviewed by administrators or the producer.');
  };

  const handleClaimProducer=()=> {
    // Save claim request
    const claims=JSON.parse(localStorage.getItem('producerClaims') || '[]');
    claims.push({
      id: Date.now(),
      producerId: producer.id,
      producerName: producer.name,
      claimedBy: 'Current User',
      claimedAt: new Date().toISOString(),
      status: 'pending_verification',
      type: 'producer'
    });
    localStorage.setItem('producerClaims',JSON.stringify(claims));
    alert('Claim submitted! Please check your email for verification instructions.');
  };

  const getBackLabel=()=> {
    switch (producerType) {
      case 'wine': return 'Back to Wineries';
      case 'spirits': return 'Back to Distilleries';
      case 'cider': return 'Back to Cideries';
      case 'mead': return 'Back to Meaderies';
      case 'fermented': return 'Back to Producers';
      default: return 'Back to Breweries';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <motion.div
        initial={{opacity: 0,x: -20}}
        animate={{opacity: 1,x: 0}}
        className="mb-6"
      >
        <Link
          to="/producers"
          className="flex items-center space-x-2 text-gray-600 hover:text-amber-600 transition-colors"
        >
          <SafeIcon icon={FiArrowLeft} className="w-5 h-5" />
          <span>{getBackLabel()}</span>
        </Link>
      </motion.div>

      {/* Producer Header */}
      <motion.div
        initial={{opacity: 0,y: 20}}
        animate={{opacity: 1,y: 0}}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8"
      >
        {/* Hero Image */}
        <div className="h-64 md:h-80 overflow-hidden">
          <img
            src={producer.image}
            alt={producer.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Producer Info */}
        <div className="p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-4xl font-bold text-gray-800">{producer.name}</h1>
                
                {/* Action Buttons */}
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={()=> setShowSuggestModal(true)}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors px-3 py-2 rounded-lg border border-blue-300 hover:border-blue-400"
                  >
                    <SafeIcon icon={FiEdit3} className="w-4 h-4" />
                    <span>Suggest Updates</span>
                  </button>
                  
                  {producer.canClaim && (
                    <button
                      onClick={handleClaimProducer}
                      className="flex items-center space-x-2 text-green-600 hover:text-green-700 transition-colors px-3 py-2 rounded-lg border border-green-300 hover:border-green-400"
                    >
                      <SafeIcon icon={FiShield} className="w-4 h-4" />
                      <span>Claim</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 text-gray-600 mb-4">
                <SafeIcon icon={FiMapPin} className="w-5 h-5" />
                <span>{producer.location}</span>
              </div>

              <p className="text-gray-600 leading-relaxed mb-6">{producer.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Founded</h3>
                  <p className="text-gray-600">{producer.founded}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Website</h3>
                  <a
                    href={producer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:text-amber-700 flex items-center space-x-1"
                  >
                    <span>Visit Website</span>
                    <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Locations */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  {producerType==='beer' ? 'Taproom' : 
                   producerType==='wine' ? 'Tasting Room' : 
                   producerType==='spirits' ? 'Visitor Center' : 'Location'} Locations
                </h3>
                <div className="space-y-2">
                  {producer.taprooms.map((location,index)=> (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <div className="font-medium text-gray-800">{location.name}</div>
                      <div className="text-sm text-gray-600">{location.address}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Products Section */}
      <motion.div
        initial={{opacity: 0,y: 20}}
        animate={{opacity: 1,y: 0}}
        transition={{delay: 0.2}}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">
            Our Products ({filteredBeverages.length})
          </h2>

          {/* Filters and Sorting */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <SafeIcon icon={FiFilter} className="w-5 h-5 text-gray-400" />
              <select
                value={filterStyle}
                onChange={(e)=> setFilterStyle(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="all">All Styles</option>
                {uniqueStyles.map((style)=> (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>

            <select
              value={sortBy}
              onChange={(e)=> setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="rating">Sort by Rating</option>
              <option value="abv">Sort by ABV</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBeverages.map((beverage,index)=> (
            <motion.div
              key={beverage.id}
              initial={{opacity: 0,y: 20}}
              animate={{opacity: 1,y: 0}}
              transition={{delay: index * 0.1}}
            >
              <BeerCard beer={beverage} index={index} />
            </motion.div>
          ))}
        </div>

        {filteredBeverages.length===0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found matching your filters.</p>
          </div>
        )}
      </motion.div>

      {/* Suggest Updates Modal */}
      <SuggestUpdatesModal
        isOpen={showSuggestModal}
        onClose={()=> setShowSuggestModal(false)}
        item={producer}
        itemType="producer"
        onSubmit={handleSuggestUpdates}
      />
    </div>
  );
}

export default BreweryProfile;