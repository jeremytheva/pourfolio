import React, { useEffect, useMemo, useState } from 'react'
import { beverageService } from '../services/beverageService.js'
import { getBrewDoneItGame } from '../services/brewDoneItService.js'

const questionText = (question) => {
  switch (question.question_type) {
    case 'producer': return `Is it made by brewery #${question.reference_id}?`
    case 'category': return `Is it in beer category #${question.reference_id}?`
    case 'abv_at_least': return `Is the ABV at least ${question.threshold}%?`
    case 'ibu_at_least': return `Is the IBU at least ${question.threshold}?`
    case 'collaboration': return 'Is it a collaboration?'
    default: return 'Controlled catalogue question'
  }
}

export default function BrewDoneItRoundHistory({ gameId, round }) {
  const [hydratedRound, setHydratedRound] = useState(round)
  const [productNames, setProductNames] = useState({})
  const guesses = Array.isArray(hydratedRound?.guesses) ? hydratedRound.guesses : []
  const questions = Array.isArray(hydratedRound?.questions) ? hydratedRound.questions : []

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
    const ids = [...new Set(guesses.map((guess) => String(guess.guessed_product_id || '')).filter(Boolean))]
    if (!ids.length) {
      setProductNames({})
      return undefined
    }

    let active = true
    Promise.all(ids.map(async (id) => {
      try {
        const product = await beverageService.getProduct(id)
        return [id, product.product_name]
      } catch {
        return [id, null]
      }
    })).then((pairs) => {
      if (!active) return
      setProductNames(Object.fromEntries(pairs.filter(([, name]) => name)))
    })

    return () => { active = false }
  }, [guesses])

  const actions = useMemo(() => [
    ...questions.map((question) => ({ type: 'question', sequence: Number(question.turn_sequence || 0), value: question })),
    ...guesses.map((guess) => ({ type: 'guess', sequence: Number(guess.turn_sequence || 0), value: guess }))
  ].sort((left, right) => left.sequence - right.sequence), [guesses, questions])

  if (!actions.length) return null

  return (
    <section className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4" aria-labelledby="round-history-heading">
      <h3 id="round-history-heading" className="font-semibold text-gray-900">Round history</h3>
      <p className="mt-1 text-sm text-gray-600">Accepted questions and guesses persist when you leave or change devices.</p>
      <ol className="mt-3 space-y-2">
        {actions.map((action) => {
          if (action.type === 'question') {
            const question = action.value
            return (
              <li className="rounded-md bg-white px-3 py-2 text-sm" key={`question-${question.id || action.sequence}`}>
                <span className="font-semibold text-gray-700">{action.sequence}. Question:</span>{' '}
                <span className="text-gray-900">{questionText(question)}</span>{' '}
                <span className="font-semibold text-amber-900">{question.answer ? 'Yes' : 'No'}</span>
              </li>
            )
          }

          const guess = action.value
          const productId = String(guess.guessed_product_id || '')
          const productLabel = productNames[productId] || `Beer #${productId}`
          return (
            <li className="rounded-md bg-white px-3 py-2 text-sm" key={`guess-${guess.id || action.sequence}`}>
              <span className="font-semibold text-gray-700">{action.sequence}. Guess:</span>{' '}
              <span className="text-gray-900">{productLabel}</span>{' '}
              <span className={guess.is_correct ? 'font-semibold text-green-800' : 'font-semibold text-gray-600'}>{guess.is_correct ? 'Correct' : 'Incorrect'}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
