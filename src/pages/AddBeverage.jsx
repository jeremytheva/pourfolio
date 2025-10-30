import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import BeverageTypeSelector from '../components/BeverageTypeSelector';
import { beverageTypes } from '../utils/beverageTypes';

const {
  FiArrowLeft,
  FiCheckCircle,
  FiInfo,
  FiPlus,
  FiSave,
  FiTag,
  FiTrendingUp,
  FiUser,
} = FiIcons;

const defaultFormState = {
  name: '',
  producer: '',
  style: '',
  abv: '',
  description: '',
  tastingNotes: '',
  purchaseLocation: '',
  price: '',
  tags: '',
};

function AddBeverage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'beer';
  const [beverageType, setBeverageType] = useState(() => (
    beverageTypes[initialType] ? initialType : 'beer'
  ));
  const [formState, setFormState] = useState(defaultFormState);
  const [submitted, setSubmitted] = useState(false);

  const currentBeverage = useMemo(
    () => beverageTypes[beverageType] || beverageTypes.beer,
    [beverageType]
  );

  const handleInputChange = (field) => (event) => {
    setFormState((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    if (submitted) {
      setSubmitted(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  const handleReset = () => {
    setFormState(defaultFormState);
    setSubmitted(false);
  };

  const handleExit = () => {
    navigate(-1);
  };

  const previewTags = formState.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <button
          type="button"
          onClick={handleExit}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <SafeIcon icon={FiArrowLeft} className="mr-2 h-4 w-4" />
          Back
        </button>
        <Link
          to="/rate-beer"
          className="inline-flex items-center text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          Looking to rate instead?
          <SafeIcon icon={FiTrendingUp} className="ml-2 h-4 w-4" />
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
      >
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="text-3xl" role="img" aria-label={currentBeverage.name}>
                {currentBeverage.icon}
              </span>
              <h1 className="text-3xl font-bold text-gray-900 mt-3">
                Add a New {currentBeverage.name}
              </h1>
              <p className="text-gray-600 mt-1">
                Capture the essential details about your beverage so you can share and revisit it later.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-500">Beverage category</span>
              <BeverageTypeSelector
                selectedType={beverageType}
                onTypeChange={setBeverageType}
                className="justify-end"
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-8 space-y-8">
          <section>
            <div className="flex items-center gap-3 mb-6">
              <SafeIcon icon={FiInfo} className="h-5 w-5 text-amber-500" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Core details</h2>
                <p className="text-sm text-gray-500">
                  Tell us the basics about the beverage you are adding.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Beverage name *</span>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={handleInputChange('name')}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                  placeholder={`e.g., Signature ${currentBeverage.name}`}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Producer *</span>
                <input
                  type="text"
                  required
                  value={formState.producer}
                  onChange={handleInputChange('producer')}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                  placeholder="Brewery, winery, cidery, etc."
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Style or variety</span>
                <input
                  type="text"
                  value={formState.style}
                  onChange={handleInputChange('style')}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                  placeholder="e.g., West Coast IPA, Cabernet Sauvignon"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">ABV</span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formState.abv}
                    onChange={handleInputChange('abv')}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                    placeholder="5.5"
                  />
                  <span className="absolute inset-y-0 right-4 flex items-center text-gray-400 text-sm">%</span>
                </div>
              </label>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <SafeIcon icon={FiUser} className="h-5 w-5 text-amber-500" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Story & tasting notes</h2>
                <p className="text-sm text-gray-500">Optional context that brings the beverage to life.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium text-gray-700">Description</span>
                <textarea
                  rows={3}
                  value={formState.description}
                  onChange={handleInputChange('description')}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                  placeholder="Share what makes this beverage special."
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium text-gray-700">Tasting notes</span>
                <textarea
                  rows={3}
                  value={formState.tastingNotes}
                  onChange={handleInputChange('tastingNotes')}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                  placeholder="Aromas, flavors, mouthfeel, finish, etc."
                />
              </label>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <SafeIcon icon={FiTag} className="h-5 w-5 text-amber-500" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Purchase information</h2>
                <p className="text-sm text-gray-500">Remember where you found it and what it cost.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Purchase location</span>
                <input
                  type="text"
                  value={formState.purchaseLocation}
                  onChange={handleInputChange('purchaseLocation')}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                  placeholder="e.g., Local bottle shop, direct from producer"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Price</span>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formState.price}
                    onChange={handleInputChange('price')}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pl-8 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                    placeholder="18.00"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium text-gray-700">Tags</span>
                <input
                  type="text"
                  value={formState.tags}
                  onChange={handleInputChange('tags')}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                  placeholder="Separate tags with commas, e.g., limited release, barrel-aged"
                />
              </label>
            </div>
          </section>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4 border-t border-gray-100">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Reset form
              </button>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
              >
                <SafeIcon icon={FiSave} className="h-4 w-4" />
                Save beverage
              </button>
            </div>
          </div>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <SafeIcon icon={FiInfo} className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Live preview</h2>
          </div>
          <div className="space-y-4 text-sm text-gray-600">
            <p>
              <strong className="text-gray-800">Name:</strong> {formState.name || '—'}
            </p>
            <p>
              <strong className="text-gray-800">Producer:</strong> {formState.producer || '—'}
            </p>
            <p>
              <strong className="text-gray-800">Style:</strong> {formState.style || '—'}
            </p>
            <p>
              <strong className="text-gray-800">ABV:</strong> {formState.abv ? `${formState.abv}%` : '—'}
            </p>
            <p>
              <strong className="text-gray-800">Description:</strong> {formState.description || '—'}
            </p>
            <p>
              <strong className="text-gray-800">Tasting notes:</strong> {formState.tastingNotes || '—'}
            </p>
            <p>
              <strong className="text-gray-800">Purchase location:</strong> {formState.purchaseLocation || '—'}
            </p>
            <p>
              <strong className="text-gray-800">Price:</strong> {formState.price ? `$${formState.price}` : '—'}
            </p>
            <div>
              <strong className="text-gray-800">Tags:</strong>
              {previewTags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {previewTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="ml-2">—</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          {submitted ? (
            <div className="flex flex-col items-start gap-4">
              <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                Saved
              </div>
              <div className="flex items-center gap-3">
                <SafeIcon icon={FiCheckCircle} className="h-8 w-8 text-emerald-500" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Beverage saved</h3>
                  <p className="text-sm text-gray-500">
                    You can now rate it, share it with friends, or add it to your cellar.
                  </p>
                </div>
              </div>
              <div className="w-full flex flex-col gap-3">
                <Link
                  to={`/rate-beer?type=${encodeURIComponent(beverageType)}`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
                >
                  <SafeIcon icon={FiTrendingUp} className="h-4 w-4" />
                  Rate this beverage now
                </Link>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  <SafeIcon icon={FiPlus} className="h-4 w-4" />
                  Add another beverage
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm text-gray-500">
              <p>
                Once you save, we will generate a quick summary you can share or revisit later. You can always edit the details from your cellar.
              </p>
              <p>
                Don’t forget to add tasting notes and tags to make searching easier.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default AddBeverage;
