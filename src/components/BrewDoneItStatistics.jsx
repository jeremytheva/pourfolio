import React from 'react'

export default function BrewDoneItStatistics({ stats }) {
  const headToHead = Array.isArray(stats.headToHead) ? stats.headToHead : []
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="statistics-heading">
      <h2 id="statistics-heading" className="text-xl font-semibold text-gray-900">Your Brew Done It record</h2>
      <p className="mt-1 text-sm text-gray-600">These totals persist across rounds, devices and future sessions.</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-5">
        <div><dt className="text-sm text-gray-600">Series</dt><dd className="text-2xl font-bold">{stats.seriesCount || 0}</dd></div>
        <div><dt className="text-sm text-gray-600">Rounds</dt><dd className="text-2xl font-bold">{stats.completedRounds || 0}</dd></div>
        <div><dt className="text-sm text-gray-600">Correct</dt><dd className="text-2xl font-bold">{stats.correctGuesses || 0}</dd></div>
        <div><dt className="text-sm text-gray-600">Points</dt><dd className="text-2xl font-bold">{stats.awardedPoints || 0}</dd></div>
        <div><dt className="text-sm text-gray-600">Average</dt><dd className="text-2xl font-bold">{stats.averagePointsPerGuessingRound || 0}</dd></div>
      </dl>

      {headToHead.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <h3 className="font-semibold text-gray-900">Head-to-head</h3>
          <table className="mt-2 min-w-full text-left text-sm">
            <thead><tr className="border-b"><th className="py-2 pr-4">Opponent</th><th className="py-2 pr-4">Rounds</th><th className="py-2 pr-4">Points</th><th className="py-2">Opponent points</th></tr></thead>
            <tbody>
              {headToHead.map((record) => (
                <tr className="border-b" key={record.opponentParticipantId}>
                  <td className="py-2 pr-4">Player {record.opponentParticipantId}</td>
                  <td className="py-2 pr-4">{record.completedRounds}</td>
                  <td className="py-2 pr-4">{record.pointsFor}</td>
                  <td className="py-2">{record.pointsAgainst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
