import React, { useEffect, useMemo, useState } from 'react'
import { beverageService } from '../services/beverageService.js'
import { getBrewDoneItGame, getBrewDoneItOptions } from '../services/brewDoneItService.js'

export default function BrewDoneItRoundHistory({ gameId, round }) {
  const [hydratedRound, setHydratedRound] = useState(round)
  const [productNames, setProductNames] = useState({})
  const [optionNames, setOptionNames] = useState({ breweries: {}, styles: {} })
  const guesses = Array.isArray(hydratedRound?.guesses) ? hydratedRound.guesses : []

  useEffect(() => {
    setHydratedRound(round)
    if (!gameId || !round?.id) return undefined
    let active = true
    getBrewDoneItGame(gameId)
      .then((payload) => {
        if (!active) return
        const authoritativeRound = Array.isArray(payload.rounds)
          ? payload.rounds.find((candidate) => String(candidate.id) === String(round.id))
          : null
        if (authoritativeRound) setHydratedRound(authoritativeRound)
      })
      .catch(() => undefined)
    return () => { active = false }
  }, [gameId, round?.id, round?.version])

  useEffect(() => {
    let active = true
    getBrewDoneItOptions().then((payload) => {
      if (!active) return
      setOptionNames({
        breweries: Object.fromEntries((payload.breweries || []).map((item) => [String(item.id), item.name])),
        styles: Object.fromEntries((payload.styles || []).map((item) => [String(item.id), item.name]))
      })
    }).catch(() => undefined)
    return () => { active = false }
  }, [])

  useEffect(() => {
    const ids = [...new Set(guesses.map((guess) => String(guess.guessed_product_id || '')).filter(Boolean))]
    if (!ids.length) { setProductNames({}); return undefined }
    let active = true
    Promise.all(ids.map(async (id) => {
      try { const product = await beverageService.getProduct(id); return [id, product.product_name] } catch { return [id, null] }
    })).then((pairs) => { if (active) setProductNames(Object.fromEntries(pairs.filter(([, name]) => name))) })
    return () => { active = false }
  }, [guesses])

  const actions = useMemo(() => guesses
    .filter((guess) => !guess.action_state || guess.action_state === 'committed')
    .map((guess) => ({ sequence: Number(guess.turn_sequence || 0), value: guess }))
    .sort((a, b) => a.sequence - b.sequence), [guesses])

  if (!actions.length) return null

  const describe = (guess) => {
    if (guess.guess_type === 'brewery') return `Brewery: ${optionNames.breweries[String(guess.guessed_producer_id)] || `#${guess.guessed_producer_id}`}`
    if (guess.guess_type === 'style') return `Style: ${optionNames.styles[String(guess.guessed_category_id)] || `#${guess.guessed_category_id}`}`
    const productId = String(guess.guessed_product_id || '')
    return `Beer: ${productNames[productId] || `#${productId}`}`
  }

  return (
    <section className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4" aria-labelledby="round-history-heading">
      <h3 id="round-history-heading" className="font-semibold text-gray-900">Formal guess history</h3>
      <p className="mt-1 text-sm text-gray-600">Only submitted brewery, beer and style outcomes affect scoring. Your saved deduction board is tracked separately.</p>
      <ol className="mt-3 space-y-2">
        {actions.map(({ sequence, value }) => (
          <li className="rounded-md bg-white px-3 py-2 text-sm" key={`guess-${value.id || sequence}`}>
            <span className="font-semibold text-gray-700">{sequence}. {describe(value)}</span>{' '}
            <span className={value.is_correct ? 'font-semibold text-green-800' : 'font-semibold text-gray-600'}>{value.is_correct ? 'Correct' : 'Incorrect'}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
