import React from 'react'

const outcomeLabel = (round) => {
  if (round.completion_reason === 'exact_beer') return 'The exact beer was identified.'
  if (round.completion_reason === 'style_fallback') return 'The style was identified as the fallback result.'
  if (round.completion_reason === 'brewery_only') return 'The brewery was identified, but the beer/style remained open.'
  if (round.completion_reason === 'unsolved') return 'The round ended without a solved outcome.'
  if (round.completion_reason === 'forfeit') return 'The round was forfeited.'
  return 'The round has ended.'
}

export default function BrewDoneItScore({ round, selectedProduct }) {
  const breakdown = round?.score_breakdown && typeof round.score_breakdown === 'object' ? round.score_breakdown : {}
  return (
    <section className="rounded-xl border border-green-200 bg-green-50 p-6" aria-labelledby="score-heading">
      <h2 id="score-heading" className="text-xl font-bold text-green-950">Round {round.round_number} complete</h2>
      <p className="mt-2 text-green-950">{outcomeLabel(round)}</p>
      {selectedProduct && <p className="mt-2 font-semibold text-green-950">Answer: {selectedProduct.product_name}{selectedProduct.producer?.producer_name ? ` by ${selectedProduct.producer.producer_name}` : ''}</p>}
      <p className="mt-3 text-2xl font-bold text-green-950">{Number(round.awarded_points || 0)} points</p>
      <div className="mt-3 flex flex-wrap gap-2 text-sm text-green-950">
        <span className="rounded-full bg-white px-3 py-1">Brewery: {round.brewery_correct ? 'correct' : 'not solved'}</span>
        <span className="rounded-full bg-white px-3 py-1">Exact beer: {round.beer_correct ? 'correct' : 'not solved'}</span>
        <span className="rounded-full bg-white px-3 py-1">Style fallback: {round.style_correct && !round.beer_correct ? 'correct' : 'not used'}</span>
      </div>
      <p className="mt-3 text-sm text-green-900">
        {Number(breakdown.breweryPoints || 0)} brewery points + {Number(breakdown.exactBeerPoints || 0)} exact-beer points + {Number(breakdown.styleFallbackPoints || 0)} style-fallback points{Number(breakdown.incorrectFormalGuessPenalty || 0) ? ` ${breakdown.incorrectFormalGuessPenalty} for incorrect formal guesses` : ''}.
      </p>
      <p className="mt-1 text-sm text-green-900">Scoring rules {round.scoring_rules_version || '3.0.0'} · Added to the persistent series record.</p>
    </section>
  )
}
