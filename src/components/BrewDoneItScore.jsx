import React from 'react'

export default function BrewDoneItScore({ round, selectedProduct }) {
  return <section className="rounded-xl border border-green-200 bg-green-50 p-6" aria-labelledby="score-heading">
    <h2 id="score-heading" className="text-xl font-bold text-green-950">Round complete</h2>
    <p className="mt-2 text-green-950">{round.completion_reason === 'correct_guess' ? 'The beer was correctly identified.' : 'The round has ended.'}</p>
    {selectedProduct && <p className="mt-2 font-semibold text-green-950">Secret beer: {selectedProduct.product_name} by {selectedProduct.producer?.producer_name}</p>}
    <p className="mt-3 text-2xl font-bold text-green-950">{Number(round.awarded_points || 0)} points</p>
    <p className="text-sm text-green-900">Scoring rules {round.scoring_rules_version || '1.0.0'}</p>
  </section>
}