import React,{useState} from 'react';
import {motion,AnimatePresence} from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const {FiX,FiSend,FiEdit3,FiAlertCircle}=FiIcons;

function SuggestUpdatesModal({isOpen,onClose,item,itemType,onSubmit}) {
  const [updates,setUpdates]=useState({
    name: item?.name || '',
    description: item?.description || '',
    details: {},
    reason: '',
    contactInfo: ''
  });

  const handleSubmit=(e)=> {
    e.preventDefault();
    
    if (!updates.reason.trim()) {
      alert('Please provide a reason for the suggested updates.');
      return;
    }

    onSubmit(updates);
    onClose();
    
    // Reset form
    setUpdates({
      name: item?.name || '',
      description: item?.description || '',
      details: {},
      reason: '',
      contactInfo: ''
    });
  };

  const getItemTypeLabel=()=> {
    switch (itemType) {
      case 'beverage': return 'Beverage';
      case 'producer': return 'Producer';
      case 'venue': return 'Venue';
      case 'event': return 'Event';
      default: return 'Item';
    }
  };

  const renderBeverageFields=()=> (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ABV (Alcohol by Volume)
        </label>
        <input
          type="number"
          step="0.1"
          value={updates.details.abv || ''}
          onChange={(e)=> setUpdates(prev=> ({
            ...prev,
            details: {...prev.details,abv: e.target.value}
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="e.g., 6.5"
        />
      </div>
      
      {item?.type==='beer' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            IBU (International Bitterness Units)
          </label>
          <input
            type="number"
            value={updates.details.ibu || ''}
            onChange={(e)=> setUpdates(prev=> ({
              ...prev,
              details: {...prev.details,ibu: e.target.value}
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="e.g., 65"
          />
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Style
        </label>
        <input
          type="text"
          value={updates.details.style || ''}
          onChange={(e)=> setUpdates(prev=> ({
            ...prev,
            details: {...prev.details,style: e.target.value}
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="e.g., American IPA"
        />
      </div>
    </>
  );

  const renderProducerFields=()=> (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Location
        </label>
        <input
          type="text"
          value={updates.details.location || ''}
          onChange={(e)=> setUpdates(prev=> ({
            ...prev,
            details: {...prev.details,location: e.target.value}
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="e.g., Portland, Oregon"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Founded Year
        </label>
        <input
          type="number"
          value={updates.details.founded || ''}
          onChange={(e)=> setUpdates(prev=> ({
            ...prev,
            details: {...prev.details,founded: e.target.value}
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="e.g., 2010"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Website
        </label>
        <input
          type="url"
          value={updates.details.website || ''}
          onChange={(e)=> setUpdates(prev=> ({
            ...prev,
            details: {...prev.details,website: e.target.value}
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="https://example.com"
        />
      </div>
    </>
  );

  const renderVenueFields=()=> (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address
        </label>
        <input
          type="text"
          value={updates.details.address || ''}
          onChange={(e)=> setUpdates(prev=> ({
            ...prev,
            details: {...prev.details,address: e.target.value}
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="123 Main Street"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number
        </label>
        <input
          type="tel"
          value={updates.details.phone || ''}
          onChange={(e)=> setUpdates(prev=> ({
            ...prev,
            details: {...prev.details,phone: e.target.value}
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="(555) 123-4567"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Website
        </label>
        <input
          type="url"
          value={updates.details.website || ''}
          onChange={(e)=> setUpdates(prev=> ({
            ...prev,
            details: {...prev.details,website: e.target.value}
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="https://example.com"
        />
      </div>
    </>
  );

  const renderEventFields=()=> (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Start Date
        </label>
        <input
          type="date"
          value={updates.details.startDate || ''}
          onChange={(e)=> setUpdates(prev=> ({
            ...prev,
            details: {...prev.details,startDate: e.target.value}
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          End Date
        </label>
        <input
          type="date"
          value={updates.details.endDate || ''}
          onChange={(e)=> setUpdates(prev=> ({
            ...prev,
            details: {...prev.details,endDate: e.target.value}
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Venue
        </label>
        <input
          type="text"
          value={updates.details.venue || ''}
          onChange={(e)=> setUpdates(prev=> ({
            ...prev,
            details: {...prev.details,venue: e.target.value}
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="Event venue name"
        />
      </div>
    </>
  );

  if (!isOpen || !item) return null;

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
          className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
          onClick={(e)=> e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <SafeIcon icon={FiEdit3} className="w-6 h-6 text-amber-600" />
              <h3 className="text-xl font-bold text-gray-800">
                Suggest Updates for {getItemTypeLabel()}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>

          {/* Current Item Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-800">{item.name}</h4>
            {item.producer && (
              <p className="text-sm text-gray-600">{item.producer}</p>
            )}
            {item.location && (
              <p className="text-sm text-gray-600">{item.location}</p>
            )}
          </div>

          {/* Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-2">
              <SafeIcon icon={FiAlertCircle} className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Suggestion Guidelines:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Only suggest factual corrections or updates</li>
                  <li>Provide reliable sources when possible</li>
                  <li>All suggestions will be reviewed before approval</li>
                  <li>You may be contacted for verification</li>
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={updates.name}
                onChange={(e)=> setUpdates(prev=> ({...prev,name: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder={`Current: ${item.name}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                rows={3}
                value={updates.description}
                onChange={(e)=> setUpdates(prev=> ({...prev,description: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                placeholder={item.description || 'Add or update description...'}
              />
            </div>

            {/* Type-specific Fields */}
            {itemType==='beverage' && renderBeverageFields()}
            {itemType==='producer' && renderProducerFields()}
            {itemType==='venue' && renderVenueFields()}
            {itemType==='event' && renderEventFields()}

            {/* Reason for Update */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Update *
              </label>
              <textarea
                rows={4}
                required
                value={updates.reason}
                onChange={(e)=> setUpdates(prev=> ({...prev,reason: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                placeholder="Explain why this information should be updated. Include sources if available..."
              />
            </div>

            {/* Contact Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Information (Optional)
              </label>
              <input
                type="text"
                value={updates.contactInfo}
                onChange={(e)=> setUpdates(prev=> ({...prev,contactInfo: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Email or phone number in case we need to verify the information"
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
                <SafeIcon icon={FiSend} className="w-4 h-4" />
                <span>Submit Suggestion</span>
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default SuggestUpdatesModal;