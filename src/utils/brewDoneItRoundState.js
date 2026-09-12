const trueFlag = (value) => value === true || value === 1 || value === '1'
const canonicalId = (value) => {
  const text = String(value ?? '').trim()
  return /^[1-9]\d*$/.test(text) ? text : null
}

export const mergeProjectedRoundGuess = (currentRound, projectedRound, guess) => {
  const byId = new Map()
  for (const existing of Array.isArray(currentRound?.guesses) ? currentRound.guesses : []) {
    if (existing?.id !== null && existing?.id !== undefined) byId.set(String(existing.id), existing)
  }
  if (guess?.id !== null && guess?.id !== undefined) byId.set(String(guess.id), guess)

  return {
    ...projectedRound,
    guesses: [...byId.values()].sort((left, right) => Number(left.turn_sequence || 0) - Number(right.turn_sequence || 0))
  }
}

export const solvedOutcomeReferences = (round, beers = []) => {
  const guesses = (Array.isArray(round?.guesses) ? round.guesses : []).filter((guess) => trueFlag(guess?.is_correct))
  const beerGuess = guesses.find((guess) => guess.guess_type === 'beer')
  const breweryGuess = guesses.find((guess) => guess.guess_type === 'brewery')
  const styleGuess = guesses.find((guess) => guess.guess_type === 'style')

  const productId = canonicalId(beerGuess?.guessed_product_id)
  const solvedBeer = productId ? beers.find((beer) => String(beer?.id) === productId) : null

  return {
    productId,
    breweryId: canonicalId(solvedBeer?.producerId) || canonicalId(breweryGuess?.guessed_producer_id),
    styleId: canonicalId(solvedBeer?.categoryId) || canonicalId(styleGuess?.guessed_category_id)
  }
}

export const __testables = { trueFlag, canonicalId }
