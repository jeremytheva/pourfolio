import React, { useMemo, useState } from 'react'
import {
  BONUS_ATTRIBUTE_DEFAULT_POINT_VALUE,
  BONUS_ATTRIBUTE_MAX_POINT_VALUE,
  BONUS_ATTRIBUTE_MIN_POINT_VALUE,
  BONUS_ATTRIBUTE_POINT_STEP,
  bonusScoreFromPoints,
  categoryMatchesRatingKey,
  effectiveBonusPointValue,
  selectedBonusPointTotal
} from '../lib/bonusAttributes.js'

function BonusOption({ attribute, checked, onToggle }) {
  const points = effectiveBonusPointValue(attribute)
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${checked ? 'border-amber-600 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(String(attribute.id))}
        className="mt-1 h-5 w-5 accent-amber-700"
      />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-gray-900">{attribute.description}</span>
        <span className="mt-0.5 block text-xs text-gray-500">+{points.toFixed(1)} bonus points</span>
      </span>
    </label>
  )
}

export function RatingCardBonusAttributes({ ratingKey, label, bonusAttributes, bonusCategories, selectedIds, onToggle }) {
  const [open, setOpen] = useState(false)
  const matchingCategoryKeys = useMemo(() => new Set(
    (bonusCategories || [])
      .filter((category) => categoryMatchesRatingKey(category.name, ratingKey))
      .map((category) => category.key)
  ), [bonusCategories, ratingKey])
  const matchingAttributes = useMemo(() => (bonusAttributes || []).filter((attribute) =>
    (attribute.category_keys || []).some((key) => matchingCategoryKeys.has(key))
  ), [bonusAttributes, matchingCategoryKeys])

  if (!matchingAttributes.length) return null
  const selected = matchingAttributes.filter((attribute) => selectedIds.includes(String(attribute.id))).length

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left font-semibold text-gray-900"
      >
        <span>Bonus attributes for {label}</span>
        <span className="text-sm font-medium text-amber-800">{selected}/{matchingAttributes.length} selected · {open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {matchingAttributes.map((attribute) => (
            <BonusOption
              key={attribute.id}
              attribute={attribute}
              checked={selectedIds.includes(String(attribute.id))}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
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
  const normalisedQuery = query.trim().toLocaleLowerCase()

  const categoryRows = useMemo(() => (bonusCategories || []).map((category) => {
    const allItems = (bonusAttributes || []).filter((attribute) => (attribute.category_keys || []).includes(category.key))
    const categoryMatches = normalisedQuery && String(category.name || '').toLocaleLowerCase().includes(normalisedQuery)
    const items = allItems.filter((attribute) =>
      !normalisedQuery || categoryMatches || String(attribute.description || '').toLocaleLowerCase().includes(normalisedQuery)
    )
    return { ...category, allItems, items }
  }).filter((category) => category.items.length), [bonusAttributes, bonusCategories, normalisedQuery])

  const toggleCategory = (key) => setExpanded((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  const showAll = () => setExpanded(new Set((bonusCategories || []).map((category) => category.key)))
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
      setExpanded((current) => new Set([...current, 'overall']))
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
      <p className="mt-2 text-gray-600">Select every descriptor that applies. The selected values are added together and converted automatically to the scored Bonus value.</p>

      <div className="mt-5 grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:grid-cols-2" role="status" aria-live="polite">
        <div><p className="text-sm text-amber-800">Selected attribute points</p><p className="text-2xl font-bold text-amber-950">{totalPoints.toFixed(2)}</p></div>
        <div><p className="text-sm text-amber-800">Calculated Bonus score</p><p className="text-2xl font-bold text-amber-950">{bonusScore} / 2</p></div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-semibold text-gray-800">Search bonus attributes
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search descriptions or categories"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={showAll} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium">Show all categories</button>
          <button type="button" onClick={hideAll} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium">Hide all categories</button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {categoryRows.map((category) => {
          const isOpen = normalisedQuery ? true : expanded.has(category.key)
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
              {isOpen && <div className="grid gap-3 p-4 sm:grid-cols-2">{category.items.map((attribute) => (
                <BonusOption key={`${category.key}-${attribute.id}`} attribute={attribute} checked={selectedIds.includes(String(attribute.id))} onToggle={onToggle} />
              ))}</div>}
            </section>
          )
        })}
        {!categoryRows.length && <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">No bonus attributes match this search.</p>}
      </div>

      <section className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5" aria-labelledby="add-bonus-attribute-heading">
        <h3 id="add-bonus-attribute-heading" className="text-lg font-semibold text-gray-900">Add a new bonus attribute</h3>
        <p className="mt-1 text-sm text-gray-600">New attributes are private to your account, use the Overall category, and default to {BONUS_ATTRIBUTE_DEFAULT_POINT_VALUE.toFixed(1)} points.</p>
        {createError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{createError}</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_10rem]">
          <label className="text-sm font-semibold text-gray-800">Description
            <input maxLength={255} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm font-semibold text-gray-800">Point value
            <input
              type="number"
              min={BONUS_ATTRIBUTE_MIN_POINT_VALUE}
              max={BONUS_ATTRIBUTE_MAX_POINT_VALUE}
              step={BONUS_ATTRIBUTE_POINT_STEP}
              value={pointValue}
              onChange={(event) => setPointValue(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3"><span className="text-sm text-gray-600">Category: <strong>Overall</strong></span><button type="button" onClick={submitNewAttribute} disabled={creating} className="rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white disabled:bg-gray-400">{creating ? 'Adding…' : 'Add attribute'}</button></div>
      </section>
    </div>
  )
}
