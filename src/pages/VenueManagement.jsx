import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { 
  getUserVenues, 
  hasVenuePermission, 
  addBeverageToVenue, 
  addVenueStaff, 
  updateBeverageStatus,
  getVenueAnalytics,
  takeVenueOwnership,
  venueRoles 
} from '../utils/venueManagement';
import EventModal from '../components/EventModal';

const { 
  FiMapPin, FiUsers, FiPackage, FiPlus, FiEdit3, FiTrash2, 
  FiStar, FiTrendingUp, FiSettings, FiCheck, FiX, FiCalendar,
  FiMessageCircle, FiShield, FiBarChart3
} = FiIcons;

function VenueManagement({ user }) {
  const [userVenues, setUserVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAddBeverageModal, setShowAddBeverageModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showOwnershipModal, setShowOwnershipModal] = useState(false);

  useEffect(() => {
    const venues = getUserVenues(user);
    setUserVenues(venues);
    if (venues.length > 0 && !selectedVenue) {
      setSelectedVenue(venues[0]);
    }
  }, [user]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiBarChart3 },
    { id: 'beverages', label: 'Beverages', icon: FiPackage },
    { id: 'staff', label: 'Staff', icon: FiUsers },
    { id: 'events', label: 'Events', icon: FiCalendar },
    { id: 'reviews', label: 'Reviews', icon: FiMessageCircle }
  ];

  const handleTakeOwnership = (venue) => {
    setSelectedVenue(venue);
    setShowOwnershipModal(true);
  };

  const OwnershipModal = ({ venue, isOpen, onClose }) => {
    const [verificationData, setVerificationData] = useState({
      businessLicense: '',
      taxId: '',
      ownershipProof: '',
      contactEmail: '',
      contactPhone: ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      const success = takeVenueOwnership(venue.id, user, verificationData);
      if (success) {
        alert('Ownership claim submitted! Admin approval required.');
        onClose();
      } else {
        alert('Failed to submit ownership claim.');
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-2xl w-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Claim Venue Ownership</h3>
            <button onClick={onClose}>
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>
          
          <div className="mb-6 p-4 bg-amber-50 rounded-lg">
            <h4 className="font-medium text-amber-800">{venue.name}</h4>
            <p className="text-sm text-amber-600">{venue.city}, {venue.state}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business License Number
              </label>
              <input
                type="text"
                required
                value={verificationData.businessLicense}
                onChange={(e) => setVerificationData(prev => ({...prev, businessLicense: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax ID / EIN
              </label>
              <input
                type="text"
                required
                value={verificationData.taxId}
                onChange={(e) => setVerificationData(prev => ({...prev, taxId: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                required
                value={verificationData.contactEmail}
                onChange={(e) => setVerificationData(prev => ({...prev, contactEmail: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg"
              >
                Submit Claim
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (userVenues.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <SafeIcon icon={FiMapPin} className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No Venues Found</h3>
          <p className="text-gray-400 mb-6">
            {user?.type === 'Brewery Login' 
              ? "You don't own or manage any venues yet. Claim ownership of your venue to get started."
              : "You don't have access to manage any venues."
            }
          </p>
          {user?.type === 'Brewery Login' && (
            <button 
              onClick={() => setShowOwnershipModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg"
            >
              Claim Venue Ownership
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Venues</h1>
            <p className="text-gray-600">Manage your venues, beverages, staff, and events</p>
          </div>
          
          {user?.type === 'Brewery Login' && (
            <button
              onClick={() => setShowOwnershipModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <SafeIcon icon={FiPlus} className="w-4 h-4" />
              <span>Claim New Venue</span>
            </button>
          )}
        </div>
      </motion.div>

      <div className="flex gap-6">
        {/* Venue Selector */}
        <div className="w-1/4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-800 mb-4">Your Venues</h3>
            <div className="space-y-2">
              {userVenues.map((venue) => (
                <button
                  key={venue.id}
                  onClick={() => setSelectedVenue(venue)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedVenue?.id === venue.id
                      ? 'bg-amber-50 border-amber-300'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-800">{venue.name}</div>
                  <div className="text-sm text-gray-600">{venue.type}</div>
                  <div className="text-xs text-gray-500">{venue.city}, {venue.state}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {selectedVenue && (
            <div className="bg-white rounded-lg border border-gray-200">
              {/* Venue Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedVenue.name}</h2>
                    <p className="text-gray-600">{selectedVenue.type} • {selectedVenue.city}, {selectedVenue.state}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      {selectedVenue.staff?.find(s => s.userId === user.id)?.role || 'Owner'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                        activeTab === tab.id
                          ? 'border-amber-500 text-amber-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <SafeIcon icon={tab.icon} className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{selectedVenue.beverageCount || 0}</div>
                        <div className="text-sm text-blue-800">Beverages</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{selectedVenue.totalRatings || 0}</div>
                        <div className="text-sm text-green-800">Total Ratings</div>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-amber-600">
                          {selectedVenue.averageRating?.toFixed(1) || '0.0'}
                        </div>
                        <div className="text-sm text-amber-800">Avg Rating</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">{selectedVenue.staff?.length || 0}</div>
                        <div className="text-sm text-purple-800">Staff Members</div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {hasVenuePermission(user, selectedVenue, 'manage_beverages') && (
                        <button
                          onClick={() => setShowAddBeverageModal(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex items-center space-x-2"
                        >
                          <SafeIcon icon={FiPlus} className="w-5 h-5" />
                          <span>Add Beverage</span>
                        </button>
                      )}
                      
                      {hasVenuePermission(user, selectedVenue, 'create_events') && (
                        <button
                          onClick={() => setShowEventModal(true)}
                          className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg flex items-center space-x-2"
                        >
                          <SafeIcon icon={FiCalendar} className="w-5 h-5" />
                          <span>Create Event</span>
                        </button>
                      )}
                      
                      {hasVenuePermission(user, selectedVenue, 'manage_staff') && (
                        <button
                          onClick={() => setShowAddStaffModal(true)}
                          className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg flex items-center space-x-2"
                        >
                          <SafeIcon icon={FiUsers} className="w-5 h-5" />
                          <span>Add Staff</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Beverages Tab */}
                {activeTab === 'beverages' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800">Venue Beverages</h3>
                      {hasVenuePermission(user, selectedVenue, 'manage_beverages') && (
                        <button
                          onClick={() => setShowAddBeverageModal(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                        >
                          <SafeIcon icon={FiPlus} className="w-4 h-4" />
                          <span>Add Beverage</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedVenue.beverages?.map((beverage) => (
                        <div key={beverage.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-800">{beverage.name}</h4>
                              <p className="text-sm text-gray-600">{beverage.producer}</p>
                              <p className="text-xs text-gray-500">{beverage.style}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                beverage.status === 'active' ? 'bg-green-100 text-green-800' :
                                beverage.status === 'discontinued' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {beverage.status}
                              </span>
                              {hasVenuePermission(user, selectedVenue, 'manage_beverages') && (
                                <select
                                  value={beverage.status}
                                  onChange={(e) => updateBeverageStatus(selectedVenue.id, beverage.id, e.target.value, user)}
                                  className="text-xs border border-gray-300 rounded px-2 py-1"
                                >
                                  <option value="active">Active</option>
                                  <option value="discontinued">Discontinued</option>
                                  <option value="seasonal">Seasonal</option>
                                </select>
                              )}
                            </div>
                          </div>
                        </div>
                      )) || (
                        <div className="col-span-2 text-center py-8">
                          <SafeIcon icon={FiPackage} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">No beverages added yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Staff Tab */}
                {activeTab === 'staff' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800">Staff Management</h3>
                      {hasVenuePermission(user, selectedVenue, 'manage_staff') && (
                        <button
                          onClick={() => setShowAddStaffModal(true)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                        >
                          <SafeIcon icon={FiPlus} className="w-4 h-4" />
                          <span>Add Staff</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {selectedVenue.staff?.map((staff) => (
                        <div key={staff.userId} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-800">User ID: {staff.userId}</div>
                              <div className="text-sm text-gray-600">{venueRoles[staff.role]?.name}</div>
                              <div className="text-xs text-gray-500">
                                Added {new Date(staff.addedDate).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                staff.status === 'active' ? 'bg-green-100 text-green-800' :
                                staff.status === 'pending_verification' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {staff.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          
                          {/* Permissions */}
                          <div className="mt-3">
                            <div className="text-xs text-gray-500 mb-2">Permissions:</div>
                            <div className="flex flex-wrap gap-1">
                              {venueRoles[staff.role]?.permissions.map((permission) => (
                                <span key={permission} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                  {permission.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )) || (
                        <div className="text-center py-8">
                          <SafeIcon icon={FiUsers} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">No staff members yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reviews Tab */}
                {activeTab === 'reviews' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-800">Customer Reviews</h3>
                    <div className="text-center py-8">
                      <SafeIcon icon={FiMessageCircle} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Review management features coming soon</p>
                      <p className="text-sm text-gray-400">Reply to customer reviews and manage feedback</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <EventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onAdd={(event) => {
          // Handle event creation for venue
          console.log('Event created for venue:', event);
          setShowEventModal(false);
        }}
      />

      <OwnershipModal
        venue={selectedVenue}
        isOpen={showOwnershipModal}
        onClose={() => setShowOwnershipModal(false)}
      />
    </div>
  );
}

export default VenueManagement;