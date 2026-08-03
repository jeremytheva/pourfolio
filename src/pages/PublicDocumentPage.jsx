import React from 'react'
import { Link } from '../lib/router.jsx'
import PublicDocumentLinks from '../components/PublicDocumentLinks.jsx'

function PublicDocumentPage({ document }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <a href="#document-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Skip to document
      </a>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="text-2xl font-bold text-amber-700">Pourfolio</Link>
          <Link to="/login" className="rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-gray-100">Sign in</Link>
        </div>
      </header>
      <main id="document-content" className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <p className="font-semibold uppercase tracking-wide text-amber-800">Public information</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">{document.title}</h1>
        <p className="mt-4 max-w-3xl text-lg text-gray-700">{document.summary}</p>
        <dl className="mt-6 grid gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 sm:grid-cols-3">
          <div><dt className="font-semibold">Version</dt><dd>{document.version}</dd></div>
          <div><dt className="font-semibold">Effective date</dt><dd>{document.effectiveDate}</dd></div>
          <div><dt className="font-semibold">Review status</dt><dd>{document.reviewStatus}</dd></div>
        </dl>
        <div className="mt-10 space-y-9">
          {document.sections.map(([heading, body]) => (
            <section key={heading} aria-labelledby={`section-${heading.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}>
              <h2 id={`section-${heading.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`} className="text-2xl font-bold">{heading}</h2>
              <p className="mt-3 leading-7 text-gray-700">{body}</p>
            </section>
          ))}
        </div>
      </main>
      <footer className="border-t border-gray-200 bg-white">
        <PublicDocumentLinks className="mx-auto flex max-w-4xl flex-wrap gap-x-5 gap-y-2 px-4 py-6 text-sm text-gray-700 sm:px-6" />
      </footer>
    </div>
  )
}

export default PublicDocumentPage
