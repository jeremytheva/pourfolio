import React, { useEffect, useMemo, useState } from 'react'
import {
  BONUS_ATTRIBUTE_DEFAULT_POINT_VALUE,
  BONUS_ATTRIBUTE_MAX_POINT_VALUE,
  BONUS_ATTRIBUTE_MIN_POINT_VALUE,
  BONUS_ATTRIBUTE_POINT_STEP,
  bonusScoreFromPoints,
  categoryMatchesRatingKey,
  effectiveBonusPointValue,
  matchesBonusSearch,
  normaliseBonusCategoryKey,
  selectedBonusPointTotal
} from '../lib/bonusAttributes.js'

function BonusOption({ attribute, checked, onToggle }) {
  const points = effectiveBonusPointValue(attribute)
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${checked ? 'border-amber-600 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <input type="checkbox" checked={checked} onChange={() => onToggle(String(attribute.id))} className="mt-1 h-5 w-5 accent-amber-700" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-gray-900">{attribute.description}</span>
        <span className="mt-0.5 block text-xs text-gray-500">+{points.toFixed(1)} bonus points</span>
      </span>
    </label>
  )
}

const attributeGrid = (attributes, selectedIds, onToggle, keyPrefix = '') => (
  <div className="grid gap-3 sm:grid-cols-2">
    {attributes.map((attribute) => (
      <BonusOption
        key={`${keyPrefix}${attribute.id}`}
        attribute={attribute}
        checked={selectedIds.includes(String(attribute.id))}
        onToggle={onToggle}
      />
    ))}
  </div>
)

export function RatingCardBonusAttributes({ ratingKey, label, bonusAttributes, bonusCategories, selectedIds, onToggle }) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    setQuery('')
  }, [ratingKey])

  const matchingCategoryKeys = useMemo(() => new Set(
    (bonusCategories || [])
      .filter((category) => categoryMatchesRatingKey(category.name, ratingKey))
      .map((category) => category.key)
  ), [bonusCategories, ratingKey])
  const matchingAttributes = useMemo(() => (bonusAttributes || []).filter((attribute) =>
    (attribute.category_keys || []).some((key) => matchingCategoryKeys.has(key))
  ), [bonusAttributes, matchingCategoryKeys])
  const filteredAttributes = useMemo(() => matchingAttributes.filter((attribute) =>
    matchesBonusSearch(query, attribute.description)
  ), [matchingAttributes, query])

  if (!matchingAttributes.length) return null

  const selected = matchingAttributes.filter((attribute) => selectedIds.includes(String(attribute.id))).length
  const searchId = `bonus-search-${normaliseBonusCategoryKey(ratingKey) || 'rating'}`

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4" aria-labelledby={`${searchId}-heading`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 id={`${searchId}-heading`} className="font-semibold text-gray-900">Bonus attributes for {label}</h3>
        <span className="text-sm font-medium text-amber-800">{selected}/{matchingAttributes.length} selected</span>
      </div>
      <p className="mt-1 text-sm text-gray-600">Select any descriptors that apply to this part of the tasting.</p>
      <label htmlFor={searchId} className="mt-4 block text-sm font-semibold text-gray-800">
        Search {label} bonus attributes
      </label>
      <input
        id={searchId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Search ${label.toLocaleLowerCase()} descriptors`}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
      />
      <div className="mt-4">
        {filteredAttributes.length
          ? attributeGrid(filteredAttributes, selectedIds, onToggle)
          : <p className="rounded-lg bg-white p-4 text-sm text-gray-600">No {label.toLocaleLowerCase()} bonus attributes match this search.</p>}
      </div>
    </section>
  )
}

export function AllBonusAttributes({ bonusAttributes, bonusCategories, selectedIds, onToggle, onCreate, headingRef }) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(() => new Set())
  const [description, setDescription] = useState('')
  const [pointValue, setPointValue] = useState(BONUS_ATTRIBUTE_DEFAULT_POINT_VALUE)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const totalPoints = selectedBonusPointTotal(bonusAttributes, selectedIds)
  const bonusScore = bonusScoreFromPoints(totalPoints)
  const hasQuery = Boolean(query.trim())

  const categoryRows = useMemo(() => (bonusCategories || []).map((category) => {
    const allItems = (bonusAttributes || []).filter((attribute) => (attribute.category_keys || []).includes(category.key))
    const items = allItems.filter((attribute) => matchesBonusSearch(query, category.name, attribute.description))
    return {
      ...category,
      isOverall: normaliseBonusCategoryKey(category.name || category.key) === 'overall',
      allItems,
      items
    }
  }), [bonusAttributes, bonusCategories, query])

  const overallCategory = categoryRows.find((category) => category.isOverall) || null
  const otherCategories = categoryRows.filter((category) => !category.isOverall && category.items.length)
  const toggleCategory = (key) => setExpanded((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
  const showAll = () => setExpanded(new Set(categoryRows.filter((category) => !category.isOverall).map((category) => category.key)))
  const hideAll = () => setExpanded(new Set())

  const submitNewAttribute = async () => {
    if (creating) return
    if (!description.trim()) {
      setCreateError('Enter a description for the bonus attribute.')
      return
    }
    setCreateError('')
    setCreating(true)
    try {
      await onCreate({ description, pointValue: Number(pointValue) })
      setDescription('')
      setPointValue(BONUS_ATTRIBUTE_DEFAULT_POINT_VALUE)
    } catch (error) {
      setCreateError(error.message || 'The bonus attribute could not be created.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-amber-700">Bonus attributes</p>
      <h2 ref={headingRef} tabIndex={-1} className="mt-2 text-3xl font-bold text-gray-900 outline-none">All bonus attributes</h2>
      <p className="mt-2 text-gray-600">Select every descriptor that applies. Overall attributes stay visible; rating-specific attributes are grouped below.</p>
      <div className="mt-5 grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:grid-cols-2" role="status" aria-live="polite">
        <div><p className="text-sm text-amber-800">Selected attribute points</p><p className="text-2xl font-bold text-amber-950">{totalPoints.toFixed(2)}</p></div>
        <div><p className="text-sm text-amber-800">Calculated Bonus score</p><p className="text-2xl font-bold text-amber-950">{bonusScore} / 2</p></div>
      </div>

      <label htmlFor="all-bonus-search" className="mt-6 block text-sm font-semibold text-gray-800">Search bonus attributes</label>
      <input
        id="all-bonus-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search descriptions or categories"
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
      />

      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/40 p-4" aria-labelledby="overall-bonus-heading">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id="overall-bonus-heading" className="text-lg font-semibold text-gray-900">Overall attributes</h3>
          {overallCategory && <span className="text-sm text-gray-600">{overallCategory.allItems.filter((attribute) => selectedIds.includes(String(attribute.id))).length}/{overallCategory.allItems.length} selected</span>}
        </div>
        <p className="mt-1 text-sm text-gray-600">Whole-beer descriptors that are not tied to one rating dimension.</p>
        <div className="mt-4">
          {!overallCategory
            ? <p className="rounded-lg bg-white p-4 text-sm text-gray-600">No Overall bonus category is available.</p>
            : overallCategory.items.length
              ? attributeGrid(overallCategory.items, selectedIds, onToggle, 'overall-')
              : <p className="rounded-lg bg-white p-4 text-sm text-gray-600">No Overall bonus attributes match this search.</p>}
        </div>
      </section>

      <section className="mt-6" aria-labelledby="other-bonus-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 id="other-bonus-heading" className="text-lg font-semibold text-gray-900">Other attributes</h3>
            <p className="mt-1 text-sm text-gray-600">Rating-specific descriptors are hidden until opened. Searching reveals matching groups automatically.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={showAll} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium">Show all categories</button>
            <button type="button" onClick={hideAll} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium">Hide other categories</button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {otherCategories.map((category) => {
            const isOpen = hasQuery || expanded.has(category.key)
            const selectedCount = category.allItems.filter((attribute) => selectedIds.includes(String(attribute.id))).length
            return (
              <section key={category.key} className="overflow-hidden rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => toggleCategory(category.key)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 bg-gray-50 px-4 py-3 text-left"
                >
                  <span className="font-semibold text-gray-900">{category.name}</span>
                  <span className="text-sm text-gray-600">{selectedCount}/{category.allItems.length} selected · {isOpen ? 'Hide' : 'Show'}</span>
                </button>
                {isOpen && <div className="p-4">{attributeGrid(category.items, selectedIds, onToggle, `${category.key}-`)}</div>}
              </section>
            )
          })}
          {!otherCategories.length && <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">{hasQuery ? 'No other bonus attributes match this search.' : 'No rating-specific bonus categories are available.'}</p>}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5" aria-labelledby="add-bonus-attribute-heading">
        <h3 id="add-bonus-attribute-heading" className="text-lg font-semibold text-gray-900">Add a new bonus attribute</h3>
        <p className="mt-1 text-sm text-gray-600">New attributes are private to your account, use the Overall category, and default to {BONUS_ATTRIBUTE_DEFAULT_POINT_VALUE.toFixed(1)} points.</p>
        {createError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{createError}</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_10rem]">
          <label className="text-sm font-semibold text-gray-800">Description<input maxLength={255} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="text-sm font-semibold text-gray-800">Point value<input type="number" min={BONUS_ATTRIBUTE_MIN_POINT_VALUE} max={BONUS_ATTRIBUTE_MAX_POINT_VALUE} step={BONUS_ATTRIBUTE_POINT_STEP} value={pointValue} onChange={(event) => setPointValue(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3"><span className="text-sm text-gray-600">Category: <strong>Overall</strong></span><button type="button" onClick={submitNewAttribute} disabled={creating} className="rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white disabled:bg-gray-400">{creating ? 'Adding…' : 'Add attribute'}</button></div>
      </section>
    </div>
  )
}
