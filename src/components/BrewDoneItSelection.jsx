import React, { useState } from 'react'
import BrewDoneItBeerPicker from './BrewDoneItBeerPicker.jsx'

export default function BrewDoneItSelection({ busy, onSelect }) {
  const [productId, setProductId] = useState('')
  return (
    <form onSubmit={(event) => { event.preventDefault(); if (productId) onSelect(productId) }}>
      <h3 className="text-lg font-semibold text-gray-900">Choose the next beer</h3>
      <p className="mt-1 text-sm text-gray-600">Your opponent will receive the next round without seeing this beer.</p>
      <div className="mt-4">
        <BrewDoneItBeerPicker
          id="brew-done-it-next-beer"
          label="Beer to guess"
          value={productId}
          onChange={setProductId}
          disabled={busy}
          helpText="Search the full catalogue for the secret beer in the next round."
        />
      </div>
      <button disabled={busy || !productId} className="mt-3 rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-60">Start next round</button>
    </form>
  )
}
