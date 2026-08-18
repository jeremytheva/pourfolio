import React, { useState } from 'react'

export default function BrewDoneItSelection({ products, busy, onSelect }) {
  const [productId, setProductId] = useState('')
  return <form onSubmit={(event) => { event.preventDefault(); if (productId) onSelect(productId) }}>
    <h3 className="text-lg font-semibold text-gray-900">Choose the secret beer</h3>
    <p className="mt-1 text-sm text-gray-600">Make sure your opponent cannot see the screen. The choice disappears after it is accepted.</p>
    <label className="mt-4 block text-sm font-medium text-gray-800">Beer
      <select required value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500">
        <option value="">Choose a beer</option>
        {products.map((item) => <option value={item.id} key={item.id}>{item.product_name} — {item.producer?.producer_name}</option>)}
      </select>
    </label>
    <button disabled={busy} className="mt-3 rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-60">Lock in secret beer</button>
  </form>
}