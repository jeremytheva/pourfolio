import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FiBookOpen, FiRefreshCw, FiSearch } from 'react-icons/fi'
import { Link } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'
import { styleService } from '../services/styleService.js'

function Styles() {
  const [styles, setStyles] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const errorRef = useRef(null)

  useEffect(() => {
    let active = true
    setStatus('loading')
    setError('')
    styleService.listVerifiedStyles()
      .then((items) => {
        if (!active) return
        setStyles(items)
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'Beer styles could not be loaded.')
        setStatus('error')
      })
    return () => { active = false }
  }, [reloadKey])

  useEffect(() => {
    if (status === 'error') errorRef.current?.focus()
  }, [status])

  const filteredStyles = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    if (!needle) return styles
    return styles.filter(({ style }) => style.category_name.toLocaleLowerCase().includes(needle))
  }, [query, styles])

  if (status === 'loading') {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-gray-600" role="status">Loading beer styles…</div>
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 outline-none focus:ring-2 focus:ring-red-300">
          <h1 className="text-lg font-semibold">Beer styles unavailable</h1>
          <p className="mt-1">{error}</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-4 inline-flex items-center rounded-lg bg-red-700 px-4 py-2 font-medium text-white focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2">
            <SafeIcon icon={FiRefreshCw} className="mr-2 h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3 text-amber-700">
          <SafeIcon icon={FiBookOpen} className="h-6 w-6" />
          <p className="text-sm font-semibold uppercase tracking-wide">Beer Style Explorer</p>
        </div>
        <h1 className="mt-2 text-4xl font-bold text-gray-900">Explore verified beer styles</h1>
        <p className="mt-3 max-w-3xl text-gray-600">Styles shown here come only from verified product-to-category relationships in the current Pourfolio catalogue. Reference descriptions and characteristics will be added only when a governed source is available.</p>
      </header>

      <section className="mt-8" aria-labelledby="styles-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="styles-heading" className="text-2xl font-semibold text-gray-900">Styles</h2>
            <p className="mt-1 text-sm text-gray-600">{styles.length} verified {styles.length === 1 ? 'style' : 'styles'} represented in the catalogue.</p>
          </div>
          <label className="block w-full text-sm font-medium text-gray-700 sm:max-w-xs">
            Search styles
            <span className="relative mt-1 block">
              <SafeIcon icon={FiSearch} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
            </span>
          </label>
        </div>

        {filteredStyles.length === 0 ? (
          <div className="mt-5 rounded-xl border border-gray-200 bg-white p-6 text-gray-600" role="status">
            {styles.length === 0 ? 'No verified beer styles are currently represented in the catalogue.' : 'No beer styles match this search.'}
          </div>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStyles.map(({ style, productCount, breweryCount }) => (
              <li key={style.id}>
                <Link to={`/styles/${style.id}`} className="block h-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
                  <h3 className="text-lg font-semibold text-gray-900">{style.category_name}</h3>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-gray-500">Beers</dt><dd className="mt-1 font-semibold text-gray-900">{productCount}</dd></div>
                    <div><dt className="text-gray-500">Breweries</dt><dd className="mt-1 font-semibold text-gray-900">{breweryCount}</dd></div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Styles
