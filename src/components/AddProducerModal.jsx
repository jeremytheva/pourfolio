import React,{useState} from 'react';
import {motion,AnimatePresence} from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {beverageTypes} from '../utils/beverageTypes';

const {FiX,FiPlus,FiMapPin,FiGlobe,FiCalendar}=FiIcons;

function AddProducerModal({isOpen,onClose,onSubmit}) {
  const [producerData,setProducerData]=useState({
    name: '',
    type: 'beer',
    location: '',
    city: '',
    state: '',
    country: 'USA',
    description: '',
    founded: '',
    website: '',
    email: '',
    phone: '',
    specialties: [],
    image: ''
  });

  const [newSpecialty,setNewSpecialty]=useState('');

  const producerTypes=Object.entries(beverageTypes).map(([key,type])=> ({
    key,
    name: type.name,
    icon: type.icon,
    producerLabel: key==='beer' ? 'Brewery' : 
                  key==='wine' ? 'Winery' : 
                  key==='spirits' ? 'Distillery' : 
                  key==='cider' ? 'Cidery' : 
                  key==='mead' ? 'Meadery' : 'Producer'
  }));

  const commonSpecialties={
    beer: ['Craft Beer','IPAs','Stouts','Lagers','Sours','Barrel-Aged','Seasonal','Local Brews'],
    wine: ['Red Wine','White Wine','Rosé','Sparkling','Organic','Biodynamic','Estate Grown','Vintage'],
    spirits: ['Whiskey','Bourbon','Gin','Vodka','Rum','Single Malt','Aged Spirits','Small Batch'],
    cider: ['Traditional','Dry Cider','Sweet Cider','Fruit Cider','Sparkling','Heritage Apples'],
    mead: ['Traditional Mead','Fruit Mead','Spiced Mead','Dry Mead','Sweet Mead','Sparkling'],
    fermented: ['Kombucha','Probiotics','Organic','Raw','Live Cultures','Seasonal Flavors']
  };

  const handleSubmit=(e)=> {
    e.preventDefault();
    
    if (!producerData.name.trim() || !producerData.location.trim()) {
      alert('Please fill in the required fields.');
      return;
    }

    onSubmit({
      ...producerData,
      id: Date.now(),
      addedDate: new Date().toISOString(),
      averageRating: 0,
      totalRatings: 0,
      productCount: 0,
      canClaim: true
    });

    // Reset form
    setProducerData({
      name: '',
      type: 'beer',
      location: '',
      city: '',
      state: '',
      country: 'USA',
      description: '',
      founded: '',
      website: '',
      email: '',
      phone: '',
      specialties: [],
      image: ''
    });
    
    onClose();
  };

  const addSpecialty=(specialty)=> {
    if (specialty && !producerData.specialties.includes(specialty)) {
      setProducerData(prev=> ({
        ...prev,
        specialties: [...prev.specialties,specialty]
      }));
    }
  };

  const removeSpecialty=(specialty)=> {
    setProducerData(prev=> ({
      ...prev,
      specialties: prev.specialties.filter(s=> s !==specialty)
    }));
  };

  if (!isOpen) return null;

  const selectedProducerType=producerTypes.find(t=> t.key===producerData.type);
  const availableSpecialties=commonSpecialties[producerData.type] || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        exit={{opacity: 0}}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{scale: 0.9,opacity: 0}}
          animate={{scale: 1,opacity: 1}}
          exit={{scale: 0.9,opacity: 0}}
          className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
          onClick={(e)=> e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Add New Producer</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Producer Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Producer Type *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {producerTypes.map((type)=> (
                  <button
                    key={type.key}
                    type="button"
                    onClick={()=> setProducerData(prev=> ({...prev,type: type.key}))}
                    className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                      producerData.type===type.key
                        ? 'bg-amber-100 border-amber-300 text-amber-800'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{type.icon}</span>
                    <span className="font-medium">{type.producerLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedProducerType?.producerLabel} Name *
                </label>
                <input
                  type="text"
                  required
                  value={producerData.name}
                  onChange={(e)=> setProducerData(prev=> ({...prev,name: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., Craft Beer Co."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <SafeIcon icon={FiCalendar} className="w-4 h-4 inline mr-1" />
                  Founded Year
                </label>
                <input
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={producerData.founded}
                  onChange={(e)=> setProducerData(prev=> ({...prev,founded: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., 2010"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-800">Location Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={producerData.city}
                    onChange={(e)=> setProducerData(prev=> ({...prev,city: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Portland"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/Province *
                  </label>
                  <input
                    type="text"
                    required
                    value={producerData.state}
                    onChange={(e)=> setProducerData(prev=> ({...prev,state: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Oregon"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={producerData.country}
                    onChange={(e)=> setProducerData(prev=> ({...prev,country: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="USA"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Location String *
                </label>
                <input
                  type="text"
                  required
                  value={producerData.location}
                  onChange={(e)=> setProducerData(prev=> ({...prev,location: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Portland,Oregon,USA"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                rows={4}
                value={producerData.description}
                onChange={(e)=> setProducerData(prev=> ({...prev,description: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                placeholder="Describe the producer, their specialties, and what makes them unique..."
              />
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-800">Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <SafeIcon icon={FiGlobe} className="w-4 h-4 inline mr-1" />
                    Website
                  </label>
                  <input
                    type="url"
                    value={producerData.website}
                    onChange={(e)=> setProducerData(prev=> ({...prev,website: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={producerData.email}
                    onChange={(e)=> setProducerData(prev=> ({...prev,email: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="contact@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Specialties */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Specialties & Features
              </label>
              
              {/* Common Specialties */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {availableSpecialties.map((specialty)=> (
                  <button
                    key={specialty}
                    type="button"
                    onClick={()=> addSpecialty(specialty)}
                    disabled={producerData.specialties.includes(specialty)}
                    className={`text-xs px-3 py-2 rounded-full border transition-colors ${
                      producerData.specialties.includes(specialty)
                        ? 'bg-blue-100 border-blue-300 text-blue-800 cursor-not-allowed'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {specialty}
                  </button>
                ))}
              </div>

              {/* Custom Specialty Input */}
              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  placeholder="Add custom specialty"
                  value={newSpecialty}
                  onChange={(e)=> setNewSpecialty(e.target.value)}
                  onKeyPress={(e)=> {
                    if (e.key==='Enter') {
                      e.preventDefault();
                      addSpecialty(newSpecialty);
                      setNewSpecialty('');
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={()=> {
                    addSpecialty(newSpecialty);
                    setNewSpecialty('');
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Selected Specialties */}
              <div className="flex flex-wrap gap-2">
                {producerData.specialties.map((specialty)=> (
                  <span
                    key={specialty}
                    className="inline-flex items-center space-x-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                  >
                    <span>{specialty}</span>
                    <button
                      type="button"
                      onClick={()=> removeSpecialty(specialty)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <SafeIcon icon={FiX} className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image URL (Optional)
              </label>
              <input
                type="url"
                value={producerData.image}
                onChange={(e)=> setProducerData(prev=> ({...prev,image: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <SafeIcon icon={FiPlus} className="w-4 h-4" />
                <span>Add Producer</span>
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default AddProducerModal;