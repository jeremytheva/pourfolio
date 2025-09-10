import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiCheck, FiEye, FiEyeOff, FiUser, FiGlobe, FiUsers } = FiIcons;

function PrivacySettings() {
  const [settings, setSettings] = useState({
    profileDiscoverable: true,
    profileVisibleToPublic: false,
    profileVisibleToBuddies: true,
    ratingsVisibleToPublic: true,
    ratingsVisibleToBuddies: true,
    reviewsVisibleToPublic: true,
    reviewsVisibleToBuddies: true,
    cellarVisibleToPublic: false,
    cellarVisibleToBuddies: true,
    allowCellarSharing: true,
    checkinsVisibleToPublic: false,
    checkinsVisibleToBuddies: true,
    activityVisibleToPublic: false,
    activityVisibleToBuddies: true,
    allowMessagesFromPublic: false,
    allowMessagesFromBuddies: true,
    allowBuddyRequests: true,
    notifyOnBuddyRequest: true,
    notifyOnCellarShare: true,
    notifyOnMention: true,
    notifyOnMessage: true
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('privacySettings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      } catch (error) {
        console.error('Error loading privacy settings:', error);
      }
    }
  }, []);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    try {
      localStorage.setItem('privacySettings', JSON.stringify(settings));
      setSaveStatus('success');
      setHasChanges(false);
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const PrivacyToggle = ({ label, description, value, onChange, icon }) => (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start space-x-3 flex-1">
        <SafeIcon icon={icon} className="w-5 h-5 text-gray-500 mt-0.5" />
        <div>
          <h4 className="font-medium text-gray-800">{label}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? 'bg-amber-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Privacy Settings</h2>
        <p className="text-gray-600">Control who can see your profile, ratings, and activity</p>
      </div>

      {/* Status Message */}
      {saveStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            saveStatus === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {saveStatus === 'success' ? 'Privacy settings saved!' : 'Error saving settings.'}
        </motion.div>
      )}

      {/* Profile Visibility */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Profile Visibility</h3>
        <div className="space-y-4">
          <PrivacyToggle
            label="Make profile discoverable"
            description="Allow others to find your profile in search"
            value={settings.profileDiscoverable}
            onChange={(value) => handleSettingChange('profileDiscoverable', value)}
            icon={FiGlobe}
          />
          <PrivacyToggle
            label="Profile visible to public"
            description="Anyone can view your basic profile"
            value={settings.profileVisibleToPublic}
            onChange={(value) => handleSettingChange('profileVisibleToPublic', value)}
            icon={FiEye}
          />
          <PrivacyToggle
            label="Profile visible to buddies"
            description="Your drinking buddies can view your full profile"
            value={settings.profileVisibleToBuddies}
            onChange={(value) => handleSettingChange('profileVisibleToBuddies', value)}
            icon={FiUsers}
          />
        </div>
      </div>

      {/* Ratings & Reviews */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Ratings & Reviews</h3>
        <div className="space-y-4">
          <PrivacyToggle
            label="Ratings visible to public"
            description="Anyone can see your beverage ratings"
            value={settings.ratingsVisibleToPublic}
            onChange={(value) => handleSettingChange('ratingsVisibleToPublic', value)}
            icon={FiGlobe}
          />
          <PrivacyToggle
            label="Reviews visible to public"
            description="Anyone can read your written reviews"
            value={settings.reviewsVisibleToPublic}
            onChange={(value) => handleSettingChange('reviewsVisibleToPublic', value)}
            icon={FiGlobe}
          />
        </div>
      </div>

      {/* Cellar Collection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Cellar Collection</h3>
        <div className="space-y-4">
          <PrivacyToggle
            label="Cellar visible to buddies"
            description="Your drinking buddies can see your cellar"
            value={settings.cellarVisibleToBuddies}
            onChange={(value) => handleSettingChange('cellarVisibleToBuddies', value)}
            icon={FiUsers}
          />
          <PrivacyToggle
            label="Allow cellar sharing"
            description="Enable sharing individual items with others"
            value={settings.allowCellarSharing}
            onChange={(value) => handleSettingChange('allowCellarSharing', value)}
            icon={FiEye}
          />
        </div>
      </div>

      {/* Communication */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Communication</h3>
        <div className="space-y-4">
          <PrivacyToggle
            label="Allow messages from buddies"
            description="Your drinking buddies can message you"
            value={settings.allowMessagesFromBuddies}
            onChange={(value) => handleSettingChange('allowMessagesFromBuddies', value)}
            icon={FiUsers}
          />
          <PrivacyToggle
            label="Allow buddy requests"
            description="Others can send you drinking buddy requests"
            value={settings.allowBuddyRequests}
            onChange={(value) => handleSettingChange('allowBuddyRequests', value)}
            icon={FiUser}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-6 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <SafeIcon icon={FiCheck} className="w-5 h-5" />
          <span>Save Privacy Settings</span>
        </button>
      </div>
    </div>
  );
}

export default PrivacySettings;