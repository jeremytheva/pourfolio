import React from 'react'
import {
  FiAward,
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiCompass,
  FiList,
  FiLock,
  FiMapPin,
  FiTarget,
  FiTrendingUp,
  FiUsers
} from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon.jsx'
import { Link } from '../lib/router.jsx'

const availableFeatures = [
  {
    title: 'Discover, search & Full Tasting',
    description: 'Browse the verified catalogue, open a beer and record the structured Pourfolio tasting that powers authoritative scores.',
    to: '/home',
    icon: FiTarget
  },
  {
    title: 'Cellar',
    description: 'Track beers you own with owner-scoped quantity, container, purchase and note details.',
    to: '/cellar',
    icon: FiList
  },
  {
    title: 'Add beer & suggest corrections',
    description: 'Propose missing beers and factual catalogue corrections through the governed moderation workflow.',
    to: '/products/propose',
    icon: FiCheckCircle
  },
  {
    title: 'Beer Style Explorer',
    description: 'Browse verified canonical styles and the beers and breweries currently linked to them.',
    to: '/styles',
    icon: FiBookOpen
  },
  {
    title: 'Beer Passport',
    description: 'Track private tasting, unique beer, verified style and verified brewery exploration.',
    to: '/taste-map',
    icon: FiCompass
  },
  {
    title: 'Historical Feed',
    description: 'Review and filter your private timeline of completed Full Tastings.',
    to: '/history',
    icon: FiClock
  },
  {
    title: 'Brewery directory & rankings',
    description: 'Explore verified breweries and current product-rating-based brewery rankings.',
    to: '/places',
    icon: FiTrendingUp
  }
]

const plannedFeatures = [
  {
    title: 'Quick Rate',
    status: 'Provider migration required',
    description: 'A low-friction rating event without fabricating structured tasting attributes. Activation waits for the governed repeat-tasting provider contract.',
    icon: FiTarget
  },
  {
    title: 'Advanced beer rankings',
    status: 'Planned',
    description: 'Top beers by verified style, brewery and supported score metrics. Geography filters will appear only when canonical geography exists.',
    icon: FiBarChart2
  },
  {
    title: 'Lists & Want to Try',
    status: 'Planned',
    description: 'Owner-scoped intent lists including Want to Try, Favourites, Would Buy Again and brewery/venue visit lists.',
    icon: FiList
  },
  {
    title: 'Personal Taste Profile',
    status: 'Planned',
    description: 'Private analytics across styles, breweries, attributes, rating distribution, value and exploration patterns.',
    icon: FiTrendingUp
  },
  {
    title: 'Beer Passport geography',
    status: 'Waiting on canonical geography',
    description: 'Country and region exploration will extend the current Beer Passport only from governed catalogue geography.',
    icon: FiMapPin
  },
  {
    title: 'Style reference & personal context',
    status: 'Dependency-gated',
    description: 'Trusted style descriptions, characteristics, rankings and personal style statistics need governed reference and ranking sources.',
    icon: FiBookOpen
  },
  {
    title: 'Venues & Venue Scores',
    status: 'Provider migration required',
    description: 'Venue discovery and product-derived Venue Scores wait for a verified venue entity and rating-to-venue relationship.',
    icon: FiMapPin
  },
  {
    title: 'Find This Beer, follows & updates',
    status: 'Planned after venue availability data',
    description: 'Verified product availability, entity follows and update notifications must use fresh governed offering data.',
    icon: FiBell
  },
  {
    title: 'Pourfolio Match & similar beers',
    status: 'Planned after taste analytics',
    description: 'An explainable 0–100 compatibility score and similar-beer recommendations using documented style, brewery and attribute-affinity signals.',
    icon: FiTrendingUp
  },
  {
    title: 'Guest browse',
    status: 'Planned',
    description: 'Read-only catalogue, beer, brewery, style and ranking discovery through public projections without exposing owner-only data.',
    icon: FiUsers
  },
  {
    title: 'Drinking Buddies & shared activity',
    status: 'Privacy/provider gated',
    description: 'Opt-in tasting and exploration sharing with lightweight reactions, comments and Want to Try actions. Private history remains private by default.',
    icon: FiUsers
  },
  {
    title: 'Achievements & expertise indicators',
    status: 'Privacy-gated',
    description: 'Exploration achievements will recognise breadth, detailed tasting and learning rather than drinking speed or raw consumption volume.',
    icon: FiAward
  },
  {
    title: 'Year in Pourfolio',
    status: 'Planned after analytics',
    description: 'A private annual recap with share-safe derived cards built from verified personal analytics.',
    icon: FiBarChart2
  },
  {
    title: 'Account export & deletion',
    status: 'Identity lifecycle gated',
    description: 'Portable account export, useful CSV views and governed account deletion will reuse the existing server-side identity lifecycle authority.',
    icon: FiLock
  },
  {
    title: 'Events',
    status: 'Planned after verified business identity',
    description: 'Releases, tap takeovers, festivals, tastings and tours with Interested/Going states and reminders after brewery and venue ownership is governed.',
    icon: FiAward
  },
  {
    title: 'Verified brewery & venue tools',
    status: 'Planned',
    description: 'Claimed business profiles, live factual menus, privacy-safe analytics and moderated catalogue proposals require verified business ownership. POS/menu integrations remain a later adapter layer after the native menu contract is stable.',
    icon: FiUsers
  },
  {
    title: 'Brew Done It',
    status: 'Certification required',
    description: 'The deduction-game source exists, but production discovery stays unavailable until provider, privacy, two-device and recovery certification passes.',
    icon: FiLock
  }
]

const StatusBadge = ({ children }) => (
  <span className="inline-flex rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
    {children}
  </span>
)

function FeatureRoadmap() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Pourfolio feature status</p>
        <h1 className="mt-2 text-4xl font-bold text-gray-900">Available now and what comes next</h1>
        <p className="mt-3 max-w-3xl text-gray-600">
          Active features link to working Pourfolio surfaces. Planned cards are intentionally non-interactive until their data, privacy or provider dependencies are certified.
        </p>
      </header>

      <section className="mt-8" aria-labelledby="available-features-heading">
        <div className="flex items-center gap-3">
          <SafeIcon icon={FiCheckCircle} className="h-6 w-6 text-green-700" />
          <h2 id="available-features-heading" className="text-2xl font-semibold text-gray-900">Available now</h2>
        </div>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {availableFeatures.map((feature) => (
            <li key={feature.title}>
              <Link to={feature.to} className="block h-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
                <div className="flex items-start gap-3">
                  <SafeIcon icon={feature.icon} className="mt-0.5 h-5 w-5 text-amber-700" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="planned-features-heading">
        <div className="flex items-center gap-3">
          <SafeIcon icon={FiClock} className="h-6 w-6 text-gray-600" />
          <h2 id="planned-features-heading" className="text-2xl font-semibold text-gray-900">Planned and dependency-gated</h2>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          These placeholders show approved direction without pretending the capability is usable before its governing dependency is ready.
        </p>
        <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plannedFeatures.map((feature) => (
            <li key={feature.title}>
              <article className="h-full rounded-2xl border border-dashed border-gray-300 bg-white p-5">
                <div className="flex items-start gap-3">
                  <SafeIcon icon={feature.icon} className="mt-0.5 h-5 w-5 text-gray-500" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                    <div className="mt-2"><StatusBadge>{feature.status}</StatusBadge></div>
                    <p className="mt-3 text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default FeatureRoadmap
