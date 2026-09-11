import React from 'react'

export default function BrewDoneItScore({ round, selectedProduct }) {
  const breakdown = round?.score_breakdown && typeof round.score_breakdown === 'object'
    ? round.score_breakdown
    : {}
  return (
    <section className="rounded-xl border border-green-200 bg-green-50 p-6" aria-labelledby="score-heading">
      <h2 id="score-heading" className="text-xl font-bold text-green-950">Round {round.round_number} complete</h2>
      <p className="mt-2 text-green-950">
        {round.completion_reason === 'correct_guess'
          ? 'The beer was correctly identified.'
          : round.completion_reason === 'turn_limit'
            ? 'The round reached its action limit.'
            : 'The round has ended.'}
      </p>
      {selectedProduct && (
        <p className="mt-2 font-semibold text-green-950">Beer: {selectedProduct.product_name}{selectedProduct.producer?.producer_name ? ` by ${selectedProduct.producer.producer_name}` : ''}</p>
      )}
      <p className="mt-3 text-2xl font-bold text-green-950">{Number(round.awarded_points || 0)} points</p>
      {round.completion_reason === 'correct_guess' && (
        <p className="mt-1 text-sm text-green-900">
          10 starting points{Number(breakdown.questionPenalty || 0) ? ` ${breakdown.questionPenalty} for questions` : ''}{Number(breakdown.incorrectGuessPenalty || 0) ? ` ${breakdown.incorrectGuessPenalty} for earlier guesses` : ''}.
        </p>
      )}
      <p className="mt-1 text-sm text-green-900">Scoring rules {round.scoring_rules_version || '2.0.0'} · Added to the persistent series record.</p>
    </section>
  )
}
