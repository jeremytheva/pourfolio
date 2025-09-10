import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiCamera, FiUpload, FiX, FiImage } = FiIcons;

function PhotoUpload({ photos, onPhotosChange, maxPhotos = 3 }) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (files) => {
    const newFiles = Array.from(files).slice(0, maxPhotos - photos.length);
    const newPhotos = [...photos];

    newFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPhotos.push({
            id: Date.now() + Math.random(),
            file,
            preview: e.target.result,
            name: file.name
          });
          onPhotosChange([...newPhotos]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removePhoto = (photoId) => {
    onPhotosChange(photos.filter(photo => photo.id !== photoId));
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {photos.length < maxPhotos && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragOver 
              ? 'border-amber-400 bg-amber-50' 
              : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50'
          }`}
          onClick={openFileDialog}
        >
          <SafeIcon icon={FiCamera} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Add Photos of Your Beverage
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            Drag and drop photos here, or click to select files
          </p>
          <div className="flex items-center justify-center space-x-2 text-amber-600">
            <SafeIcon icon={FiUpload} className="w-4 h-4" />
            <span className="text-sm font-medium">
              Choose Files ({photos.length}/{maxPhotos})
            </span>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>
      )}

      {/* Photo Previews */}
      {photos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative group"
            >
              <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={photo.preview}
                  alt={`Beverage photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => removePhoto(photo.id)}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <SafeIcon icon={FiX} className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-2 right-2">
                <div className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded truncate">
                  {photo.name}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <div className="text-center py-4">
          <SafeIcon icon={FiImage} className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No photos added yet</p>
        </div>
      )}
    </div>
  );
}

export default PhotoUpload;