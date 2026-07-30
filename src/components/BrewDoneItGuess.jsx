import React, { useMemo, useState } from 'react'

export default function BrewDoneItGuess({ products, busy, onGuess }) {
  const [type, setType] = useState('style')
  const [guessId, setGuessId] = useState('')
  const choices = useMemo(() => {
    const source = type === 'product'
      ? products.map((item) => [item.id, item.product_name])
      : type === 'producer'
        ? products.map((item) => [item.producer_id, item.producer?.producer_name])
        : products.map((item) => [item.product_category_id, item.category?.category_name || item.declared_category])
    return [...new Map(source.filter(([, label]) => label).map(([id, label]) => [String(id), label])).entries()]
  }, [products, type])
  return (
    <form className="mt-6 border-t border-gray-200 pt-5" onSubmit={(event) => { event.preventDefault(); if (guessId) onGuess(type, guessId) }}>
      <h3 className="text-lg font-semibold text-gray-900">Make a guess</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-800">Guess type
          <select value={type} onChange={(event) => { setType(event.target.value); setGuessId('') }} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500">
            <option value="style">Style</option><option value="producer">Brewery</option><option value="product">Beer</option>
          </select>
        </label>
        <label className="text-sm font-medium text-gray-800">Your {type === 'product' ? 'beer' : type === 'producer' ? 'brewery' : 'style'} guess
          <select required value={guessId} onChange={(event) => setGuessId(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500">
            <option value="">Choose an option</option>{choices.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
          </select>
        </label>
      </div>
      <button disabled={busy} className="mt-3 rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-60">Submit guess</button>
    </form>
  )
}
