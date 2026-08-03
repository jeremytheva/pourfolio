import React from 'react'
import { Link } from '../lib/router.jsx'
import { publicDocumentLinks } from '../data/publicDocuments.js'

function PublicDocumentLinks({ className = '' }) {
  return (
    <nav aria-label="Legal and support" className={className}>
      {publicDocumentLinks.map(([path, label]) => (
        <Link key={path} to={path} className="rounded underline decoration-gray-400 underline-offset-4 hover:text-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">
          {label}
        </Link>
      ))}
    </nav>
  )
}

export default PublicDocumentLinks
