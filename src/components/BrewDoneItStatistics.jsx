import React from 'react'

const formatDate = (value) => {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 'Not recorded'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(timestamp))
}

const scorePosition = (record) => {
  const own = Number(record.pointsFor || 0)
  const opponent = Number(record.pointsAgainst || 0)
  if (own === opponent) return 'Tied'
  return own > opponent ? 'Leading' : 'Trailing'
}

export default function BrewDoneItStatistics({ stats }) {
  const headToHead = Array.isArray(stats.headToHead) ? stats.headToHead : []
  const terminalRounds = Number(stats.terminalRounds ?? stats.completedRounds ?? 0)
  const guessingRounds = Number(stats.roundsAsGuesser || 0)
  const brewerySolved = Number(stats.brewerySolved || 0)
  const exactBeerSolved = Number(stats.exactBeerSolved || 0)
  const styleFallbackSolved = Number(stats.styleFallbackSolved || 0)
  const rate = (count) => guessingRounds ? `${Math.round((count / guessingRounds) * 100)}%` : '0%'

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="statistics-heading">
      <h2 id="statistics-heading" className="text-xl font-semibold text-gray-900">Your Brew Done It record</h2>
      <p className="mt-1 text-sm text-gray-600">These totals persist across rounds, devices and future sessions. Round totals include completed and forfeited rounds.</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4 lg:grid-cols-8">
        <div><dt className="text-sm text-gray-600">Series</dt><dd className="text-2xl font-bold">{stats.seriesCount || 0}</dd></div>
        <div><dt className="text-sm text-gray-600">Rounds ended</dt><dd className="text-2xl font-bold">{terminalRounds}</dd></div>
        <div><dt className="text-sm text-gray-600">Guessing rounds</dt><dd className="text-2xl font-bold">{guessingRounds}</dd></div>
        <div><dt className="text-sm text-gray-600">Brewery solved</dt><dd className="text-2xl font-bold">{brewerySolved}</dd><dd className="text-xs text-gray-500">{rate(brewerySolved)}</dd></div>
        <div><dt className="text-sm text-gray-600">Exact beer</dt><dd className="text-2xl font-bold">{exactBeerSolved}</dd><dd className="text-xs text-gray-500">{rate(exactBeerSolved)}</dd></div>
        <div><dt className="text-sm text-gray-600">Style fallback</dt><dd className="text-2xl font-bold">{styleFallbackSolved}</dd><dd className="text-xs text-gray-500">{rate(styleFallbackSolved)}</dd></div>
        <div><dt className="text-sm text-gray-600">Points</dt><dd className="text-2xl font-bold">{stats.awardedPoints || 0}</dd></div>
        <div><dt className="text-sm text-gray-600">Avg score</dt><dd className="text-2xl font-bold">{stats.averagePointsPerGuessingRound || 0}</dd></div>
      </dl>

      {headToHead.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <h3 className="font-semibold text-gray-900">Head-to-head</h3>
          <table className="mt-2 min-w-full text-left text-sm">
            <thead><tr className="border-b"><th className="py-2 pr-4">Opponent</th><th className="py-2 pr-4">Position</th><th className="py-2 pr-4">Rounds ended</th><th className="py-2 pr-4">Points</th><th className="py-2 pr-4">Brewery</th><th className="py-2 pr-4">Exact beer</th><th className="py-2 pr-4">Style</th><th className="py-2">Last played</th></tr></thead>
            <tbody>{headToHead.map((record) => <tr className="border-b" key={record.opponentParticipantId}><td className="py-2 pr-4">Player {record.opponentParticipantId}</td><td className="py-2 pr-4 font-medium">{scorePosition(record)}</td><td className="py-2 pr-4">{record.terminalRounds ?? record.completedRounds ?? 0}</td><td className="py-2 pr-4">{record.pointsFor}–{record.pointsAgainst}</td><td className="py-2 pr-4">{record.brewerySolvedFor || 0}–{record.brewerySolvedAgainst || 0}</td><td className="py-2 pr-4">{record.exactBeerSolvedFor || 0}–{record.exactBeerSolvedAgainst || 0}</td><td className="py-2 pr-4">{record.styleFallbackSolvedFor || 0}–{record.styleFallbackSolvedAgainst || 0}</td><td className="py-2">{formatDate(record.lastPlayedAt)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}
