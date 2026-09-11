import React, { useState } from 'react'

export default function BrewDoneItGuess({ products, busy, onGuess }) {
  const [productId, setProductId] = useState('')

  return (
    <form className="mt-6 border-t border-gray-200 pt-5" onSubmit={(event) => { event.preventDefault(); if (productId) onGuess(productId) }}>
      <h3 className="text-lg font-semibold text-gray-900">Guess the beer</h3>
      <p className="mt-1 text-sm text-gray-600">An incorrect beer costs one point if you later identify the correct beer.</p>
      <label className="mt-3 block text-sm font-medium text-gray-800">Beer
        <select required value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">Choose a beer</option>
          {products.map((item) => (
            <option value={item.id} key={item.id}>{item.product_name}{item.producer?.producer_name ? ` — ${item.producer.producer_name}` : ''}</option>
          ))}
        </select>
      </label>
      <button disabled={busy || !productId} className="mt-3 rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-60">Submit beer guess</button>
    </form>
  )
}
