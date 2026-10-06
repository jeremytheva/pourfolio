import React from 'react'
import { FiCheckCircle, FiClock, FiLock, FiMapPin, FiUsers } from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon.jsx'
import { Link } from '../lib/router.jsx'

const activeFeatures = [
  'Beer catalogue search, product pages and structured Full Tastings',
  'Private Historical Feed and product-level tasting history',
  'Private cellar management',
  'Overall and Style Scaled Score plus Retail and Purchased PPP',
  'Verified brewery discovery, brewery profiles and brewery rankings',
  'Beer Style Explorer and Beer Passport foundations',
  'Add-beer and catalogue-correction proposal workflows'
]

const plannedGroups = [
  {
    title: 'Faster tasting, repeat history & lists',
    status: 'Planned / migration gated',
    icon: FiClock,
    description: 'Quick Rate, richer repeat-tasting comparison, Want to Try, Favourites, Would Buy Again, Regulars, visit lists and custom lists.',
    dependency: 'Quick Rate waits for the governed rating-event migration. Historical product, vintage and brewery lifecycle data also remains provider-gated.'
  },
  {
    title: 'Personal intelligence & recommendations',
    status: 'Planned',
    icon: FiClock,
    description: 'A private Taste Profile, explainable Match Score, similar-beer recommendations and Year in Pourfolio recap.',
    dependency: 'Builds on stable rating history, qualifying analytics and the existing advanced-scoring foundation.'
  },
  {
    title: 'Advanced discovery & richer exploration',
    status: 'Partially available',
    icon: FiMapPin,
    description: 'Advanced beer rankings and filters, best-value discovery, richer style pages, and Beer Passport country/region exploration with an optional visual map.',
    dependency: 'Current Style Explorer and Beer Passport foundations are live. Geography and richer ranking layers wait for governed source data and ranking contracts.'
  },
  {
    title: 'Find this beer, follows & notifications',
    status: 'Dependency gated',
    icon: FiMapPin,
    description: 'Verified venue availability, where-to-buy/where-to-drink information, followed beers/breweries/venues and a controlled updates inbox.',
    dependency: 'Waits for the governed venue entity and verified availability data. Pourfolio will not infer availability from old ratings or check-ins.'
  },
  {
    title: 'Drinking Buddies, activity & events',
    status: 'Privacy gated',
    icon: FiUsers,
    description: 'Mutual Drinking Buddy relationships, opt-in shared tasting activity, lightweight reactions/comments, exploration achievements, expertise indicators and later brewery/venue events.',
    dependency: 'Private remains the default. Sharing waits for explicit visibility, relationship and authorization rules; events also depend on verified business identity.'
  },
  {
    title: 'Guest browse & account portability',
    status: 'Planned',
    icon: FiLock,
    description: 'Read-only public catalogue browsing without sign-in plus a completed portable account export with useful CSV views.',
    dependency: 'Guest mode must use strict public projections. Export reuses the existing Phase 2 account-lifecycle authority rather than creating a parallel data path.'
  },
  {
    title: 'Verified business tools',
    status: 'Dependency gated',
    icon: FiLock,
    description: 'Business claim/verification, live factual menus, event management, privacy-safe aggregate analytics and later POS/menu adapters.',
    dependency: 'Requires governed business and venue identity. Businesses will never be able to edit, suppress or rewrite consumer ratings or personal tasting history.'
  }
]

function StatusBadge({ children, tone = 'planned' }) {
  const classes = tone === 'live'
    ? 'border-green-200 bg-green-50 text-green-800'
    : tone === 'contained'
      ? 'border-blue-200 bg-blue-50 text-blue-800'
      : 'border-amber-200 bg-amber-50 text-amber-900'

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}>{children}</span>
}

export default function ProductRoadmap({ focus = '' }) {
  const brewDoneItFocused = focus === 'brew-done-it'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Product status</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          {brewDoneItFocused ? 'Brew Done It is not active yet' : 'What is live and what is planned'}
        </h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          Pourfolio keeps planned features visible without presenting unsupported actions or unverified data as live.
        </p>
      </header>

      {brewDoneItFocused && (
        <section className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-6" aria-labelledby="brew-done-it-status">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone="contained">Built, contained</StatusBadge>
            <h2 id="brew-done-it-status" className="text-xl font-semibold text-blue-950">Brew Done It</h2>
          </div>
          <p className="mt-3 max-w-3xl text-blue-950">
            The two-player deduction game has an implemented source foundation, but production play remains disabled until its provider collections, permissions, privacy and recovery evidence are certified.
          </p>
          <p className="mt-2 text-sm text-blue-900">No challenge action is available from this placeholder.</p>
          <Link to="/features" className="mt-4 inline-flex rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2">
            View the full feature plan
          </Link>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="available-now-heading">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="live">Available now</StatusBadge>
          <h2 id="available-now-heading" className="text-2xl font-semibold text-gray-900">Beer-first Pourfolio</h2>
        </div>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {activeFeatures.map((feature) => (
            <li key={feature} className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
              <SafeIcon icon={FiCheckCircle} className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </section>

      {!brewDoneItFocused && (
        <section className="mt-8" aria-labelledby="planned-features-heading">
          <div className="mb-4">
            <StatusBadge>Planned</StatusBadge>
            <h2 id="planned-features-heading" className="mt-3 text-2xl font-semibold text-gray-900">Approved planned capabilities</h2>
            <p className="mt-2 max-w-3xl text-gray-600">These are roadmap placeholders, not active controls. Dependencies stay visible so the UI does not imply unavailable functionality.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {plannedGroups.map((group) => (
              <article key={group.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-amber-50 p-2 text-amber-800" aria-hidden="true"><SafeIcon icon={group.icon} className="h-5 w-5" /></span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{group.status}</p>
                    <h3 className="mt-1 text-xl font-semibold text-gray-900">{group.title}</h3>
                  </div>
                </div>
                <p className="mt-4 text-gray-700">{group.description}</p>
                <p className="mt-3 text-sm text-gray-500">{group.dependency}</p>
              </article>
            ))}
          </div>

          <article className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge tone="contained">Built, contained</StatusBadge>
              <h3 className="text-xl font-semibold text-blue-950">Brew Done It</h3>
            </div>
            <p className="mt-3 max-w-3xl text-blue-950">The game remains launch-excluded and non-playable from production UI until provider and privacy certification is complete.</p>
            <Link to="/brew-done-it" className="mt-4 inline-flex rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2">View status</Link>
          </article>
        </section>
      )}
    </div>
  )
}
