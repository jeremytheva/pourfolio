import React from 'react'
import { Link } from '../lib/router.jsx'
import PublicDocumentLinks from '../components/PublicDocumentLinks.jsx'

const sectionId = (heading) => `section-${heading.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`

function PublicDocumentPage({ document }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <a href="#document-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Skip to document
      </a>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="rounded-md text-2xl font-bold text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2">Pourfolio</Link>
          <Link to="/login" className="rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2">Sign in</Link>
        </div>
      </header>
      <main id="document-content" tabIndex={-1} className="mx-auto max-w-4xl px-4 py-10 outline-none sm:px-6">
        <p className="font-semibold uppercase tracking-wide text-amber-800">Public information</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">{document.title}</h1>
        <p className="mt-4 max-w-3xl text-lg text-gray-700">{document.summary}</p>
        <dl className="mt-6 grid gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 sm:grid-cols-3">
          <div><dt className="font-semibold">Version</dt><dd>{document.version}</dd></div>
          <div><dt className="font-semibold">Effective date</dt><dd>{document.effectiveDate}</dd></div>
          <div><dt className="font-semibold">Review status</dt><dd>{document.reviewStatus}</dd></div>
        </dl>

        <nav aria-label="Document sections" className="mt-8 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">On this page</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {document.sections.map(([heading]) => (
              <li key={heading}>
                <a href={`#${sectionId(heading)}`} className="rounded text-amber-800 underline decoration-amber-300 underline-offset-4 hover:text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2">
                  {heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10 space-y-9">
          {document.sections.map(([heading, body]) => {
            const id = sectionId(heading)
            return (
              <section key={heading} aria-labelledby={id}>
                <h2 id={id} className="scroll-mt-6 text-2xl font-bold">{heading}</h2>
                <p className="mt-3 leading-7 text-gray-700">{body}</p>
              </section>
            )
          })}
        </div>
      </main>
      <footer className="border-t border-gray-200 bg-white">
        <PublicDocumentLinks className="mx-auto flex max-w-4xl flex-wrap gap-x-5 gap-y-2 px-4 py-6 text-sm text-gray-700 sm:px-6" />
      </footer>
    </div>
  )
}

export default PublicDocumentPage