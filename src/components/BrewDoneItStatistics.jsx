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
  const guessingRounds = Number(stats.roundsAsGuesser || 0)
  const correctGuesses = Number(stats.correctGuesses || 0)
  const accuracy = guessingRounds ? Math.round((correctGuesses / guessingRounds) * 100) : 0

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="statistics-heading">
      <h2 id="statistics-heading" className="text-xl font-semibold text-gray-900">Your Brew Done It record</h2>
      <p className="mt-1 text-sm text-gray-600">These totals persist across rounds, devices and future sessions.</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-3 lg:grid-cols-6">
        <div><dt className="text-sm text-gray-600">Series</dt><dd className="text-2xl font-bold">{stats.seriesCount || 0}</dd></div>
        <div><dt className="text-sm text-gray-600">Rounds</dt><dd className="text-2xl font-bold">{stats.completedRounds || 0}</dd></div>
        <div><dt className="text-sm text-gray-600">Guessing rounds</dt><dd className="text-2xl font-bold">{guessingRounds}</dd></div>
        <div><dt className="text-sm text-gray-600">Correct</dt><dd className="text-2xl font-bold">{correctGuesses}</dd></div>
        <div><dt className="text-sm text-gray-600">Points</dt><dd className="text-2xl font-bold">{stats.awardedPoints || 0}</dd></div>
        <div><dt className="text-sm text-gray-600">Accuracy</dt><dd className="text-2xl font-bold">{accuracy}%</dd></div>
      </dl>
      <p className="mt-3 text-sm text-gray-600">Average score when guessing: <span className="font-semibold text-gray-900">{stats.averagePointsPerGuessingRound || 0}</span> points.</p>

      {headToHead.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <h3 className="font-semibold text-gray-900">Head-to-head</h3>
          <p className="mt-1 text-sm text-gray-600">Each row combines every completed round played against that opponent.</p>
          <table className="mt-2 min-w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4">Opponent</th>
                <th className="py-2 pr-4">Position</th>
                <th className="py-2 pr-4">Rounds</th>
                <th className="py-2 pr-4">Points</th>
                <th className="py-2 pr-4">Opponent points</th>
                <th className="py-2 pr-4">Correct guesses</th>
                <th className="py-2">Last played</th>
              </tr>
            </thead>
            <tbody>
              {headToHead.map((record) => (
                <tr className="border-b" key={record.opponentParticipantId}>
                  <td className="py-2 pr-4">Player {record.opponentParticipantId}</td>
                  <td className="py-2 pr-4 font-medium">{scorePosition(record)}</td>
                  <td className="py-2 pr-4">{record.completedRounds}</td>
                  <td className="py-2 pr-4">{record.pointsFor}</td>
                  <td className="py-2 pr-4">{record.pointsAgainst}</td>
                  <td className="py-2 pr-4">{record.correctGuessesFor || 0}–{record.correctGuessesAgainst || 0}</td>
                  <td className="py-2">{formatDate(record.lastPlayedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
