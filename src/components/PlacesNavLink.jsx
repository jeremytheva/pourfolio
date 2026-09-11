import React from 'react'
import { FiMapPin } from 'react-icons/fi'
import { NavLink } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'

function PlacesNavLink({ focusRing = '' }) {
  return (
    <NavLink
      to="/places"
      className={({ isActive }) => `flex min-w-max flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium sm:flex-none ${focusRing} ${
        isActive ? 'bg-amber-100 text-amber-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <SafeIcon icon={FiMapPin} className="h-4 w-4" />
      Breweries & Venues
    </NavLink>
  )
}

export default PlacesNavLink
