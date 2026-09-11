import React, { useState } from 'react'
import BrewDoneItBeerPicker from './BrewDoneItBeerPicker.jsx'

export default function BrewDoneItGuess({ busy, onGuess }) {
  const [productId, setProductId] = useState('')

  return (
    <form className="mt-6 border-t border-gray-200 pt-5" onSubmit={(event) => { event.preventDefault(); if (productId) onGuess(productId) }}>
      <h3 className="text-lg font-semibold text-gray-900">Guess the beer</h3>
      <p className="mt-1 text-sm text-gray-600">An incorrect beer costs one point if you later identify the correct beer.</p>
      <div className="mt-3">
        <BrewDoneItBeerPicker
          id="brew-done-it-guess-beer"
          label="Beer guess"
          value={productId}
          onChange={setProductId}
          disabled={busy}
          helpText="Search the full catalogue before submitting an exact beer guess."
        />
      </div>
      <button disabled={busy || !productId} className="mt-3 rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-60">Submit beer guess</button>
    </form>
  )
}
