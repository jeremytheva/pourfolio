import React from 'react'

export default function BrewDoneItStatistics({ stats }) {
  return <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="statistics-heading">
    <h2 id="statistics-heading" className="text-xl font-semibold text-gray-900">Your statistics</h2>
    <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
      <div><dt className="text-sm text-gray-600">Games</dt><dd className="text-2xl font-bold">{stats.completedGames || 0}</dd></div>
      <div><dt className="text-sm text-gray-600">Rounds</dt><dd className="text-2xl font-bold">{stats.completedRounds || 0}</dd></div>
      <div><dt className="text-sm text-gray-600">Points</dt><dd className="text-2xl font-bold">{stats.awardedPoints || 0}</dd></div>
    </dl>
  </section>
}
