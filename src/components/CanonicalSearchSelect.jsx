import React, { useEffect, useMemo, useRef, useState } from 'react'

const normalise = (value) => String(value || '').trim().toLocaleLowerCase().replace(/\s+/gu, ' ')

/**
 * A single input and canonical-ID picker. Display names and search aliases are never submitted
 * in place of the selected canonical ID.
 */
export default function CanonicalSearchSelect({
  id, label, options, value, onChange, placeholder, description, onQueryChange
}) {
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const selected = useMemo(() => options.find((option) => String(option.id) === String(value)) || null, [options, value])
  const listId = `${id}-options`

  useEffect(() => {
    if (selected) setQuery(selected.name)
  }, [selected?.id, selected?.name])

  const matches = useMemo(() => {
    const needle = normalise(query)
    const searchAll = !needle || (selected && needle === normalise(selected.name))
    return (searchAll ? options : options.filter((option) => normalise(
      [option.name, option.description, option.searchText].filter(Boolean).join(' ')
    ).includes(needle))).slice(0, 60)
  }, [options, query, selected])
  const safeActive = Math.min(activeIndex, Math.max(0, matches.length - 1))

  const choose = (option) => {
    onChange(String(option.id))
    setQuery(option.name)
    onQueryChange?.('')
    setExpanded(false)
    setActiveIndex(0)
  }

  const type = (next) => {
    setQuery(next)
    onQueryChange?.(next)
    setExpanded(true)
    setActiveIndex(0)
    // Never retain an invisible old ID while the text is being changed.
    if (value) onChange('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setExpanded(false)
      setQuery(selected?.name || '')
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!expanded) {
        setExpanded(true)
        setActiveIndex(0)
      } else if (matches.length) {
        setActiveIndex((index) => (index + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length)
      }
      return
    }
    if (event.key === 'Enter' && expanded && matches[safeActive]) {
      event.preventDefault()
      choose(matches[safeActive])
    }
  }

  return (
    <div className="relative" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        setExpanded(false)
        if (selected) setQuery(selected.name)
      }
    }}>
      <label htmlFor={`${id}-search`} className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative mt-1">
        <input
          ref={inputRef}
          id={`${id}-search`}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && matches[safeActive] ? `${id}-option-${matches[safeActive].id}` : undefined}
          aria-describedby={description ? `${id}-hint` : `${id}-status`}
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(event) => type(event.target.value)}
          onFocus={() => setExpanded(true)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-lg border border-gray-300 py-2 pl-3 pr-12 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
        <button
          type="button"
          aria-label={`Show ${label.toLowerCase()} choices`}
          aria-expanded={expanded}
          onClick={() => {
            setQuery('')
            onQueryChange?.('')
            setExpanded(true)
            setActiveIndex(0)
            inputRef.current?.focus()
          }}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-200"
        >
          <span aria-hidden="true">⌄</span>
        </button>
      </div>
      {description && <p id={`${id}-hint`} className="mt-1 text-xs text-gray-600">{description}</p>}
      <p id={`${id}-status`} className="mt-1 text-xs text-gray-500" role="status" aria-live="polite">
        {selected ? `Selected: ${selected.name}. ` : ''}
        {expanded ? `Showing ${matches.length} of ${options.length} choices. Use arrow keys and Enter to select.` : 'Type to find a choice or open the list.'}
      </p>
      {expanded && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-300 bg-white shadow-xl">
          <ul id={listId} role="listbox" aria-label={label} className="max-h-64 overflow-y-auto py-1">
            {matches.map((option, index) => (
              <li
                id={`${id}-option-${option.id}`}
                key={option.id}
                role="option"
                aria-selected={String(option.id) === String(value)}
                className={`cursor-pointer px-3 py-2 text-sm ${index === safeActive ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <span className="block font-medium text-gray-900">{option.name}</span>
                {option.description && <span className="block text-xs text-gray-600">({option.description})</span>}
              </li>
            ))}
            {matches.length === 0 && <li className="px-3 py-3 text-sm text-gray-600" role="presentation">No matching choices found.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
