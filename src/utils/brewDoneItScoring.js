export const BREW_DONE_IT_SCORING_VERSION = '1.0.0'

export const BREW_DONE_IT_RULES = Object.freeze({
  maxGuesses: 6,
  maxQuestions: 6,
  points: Object.freeze({ product: 10, producer: 5, exactStyle: 3, relatedStyle: 1 }),
  questionCost: 1,
  incorrectGuessPenalty: 1,
  maximumTotal: 18,
  minimumTotal: 0
})

const GUESS_TYPES = new Set(['product', 'producer', 'style'])
const canonicalId = (value, label) => {
  const id = String(value ?? '').trim()
  if (!/^[1-9]\d*$/.test(id)) throw new TypeError(`${label} must be a positive canonical ID.`)
  return id
}

const parentId = (styleId, styleParentById) => {
  const value = styleParentById?.[styleId] ?? styleParentById?.get?.(styleId)
  return value === null || value === undefined || value === '' ? null : canonicalId(value, 'Style parent')
}

const stylesAreRelated = (guessId, targetId, styleParentById) => {
  const guessParent = parentId(guessId, styleParentById)
  const targetParent = parentId(targetId, styleParentById)
  return guessParent === targetId || targetParent === guessId ||
    (guessParent !== null && guessParent === targetParent)
}

/**
 * Calculates a Brew Done It v1 score without reading UI or application state.
 * IDs and the explicitly maintained style hierarchy are the complete taxonomy.
 */
export const calculateBrewDoneItScore = ({ target, guesses = [], questionCount = 0, styleParentById = {} }) => {
  if (!target || typeof target !== 'object') throw new TypeError('A scoring target is required.')
  const targetIds = {
    product: canonicalId(target.productId, 'Target product'),
    producer: canonicalId(target.producerId, 'Target producer'),
    style: canonicalId(target.styleId, 'Target style')
  }
  if (!Array.isArray(guesses)) throw new TypeError('Guesses must be an array.')
  if (!Number.isSafeInteger(questionCount) || questionCount < 0 || questionCount > BREW_DONE_IT_RULES.maxQuestions) {
    throw new RangeError(`Question count must be between 0 and ${BREW_DONE_IT_RULES.maxQuestions}.`)
  }

  const seen = new Set()
  const awardedTypes = new Set()
  const items = []
  let acceptedAttempts = 0
  let pointsAwarded = 0
  let incorrectPenalties = 0
  let completed = false

  for (let index = 0; index < guesses.length; index += 1) {
    const guess = guesses[index]
    if (!guess || !GUESS_TYPES.has(guess.type)) throw new TypeError(`Guess ${index + 1} has an invalid type.`)
    const id = canonicalId(guess.id, `Guess ${index + 1}`)
    const key = `${guess.type}:${id}`
    if (completed || acceptedAttempts >= BREW_DONE_IT_RULES.maxGuesses) {
      items.push({ type: guess.type, id, outcome: 'ignored_after_completion', points: 0, consumesAttempt: false })
      continue
    }
    if (seen.has(key)) {
      items.push({ type: guess.type, id, outcome: 'duplicate', points: 0, consumesAttempt: false })
      continue
    }

    seen.add(key)
    acceptedAttempts += 1
    let outcome = 'incorrect'
    let points = -BREW_DONE_IT_RULES.incorrectGuessPenalty
    if (!awardedTypes.has(guess.type) && id === targetIds[guess.type]) {
      outcome = 'exact'
      points = guess.type === 'product'
        ? BREW_DONE_IT_RULES.points.product
        : guess.type === 'producer'
          ? BREW_DONE_IT_RULES.points.producer
          : BREW_DONE_IT_RULES.points.exactStyle
      awardedTypes.add(guess.type)
      if (guess.type === 'product') completed = true
    } else if (!awardedTypes.has('style') && guess.type === 'style' && stylesAreRelated(id, targetIds.style, styleParentById)) {
      outcome = 'related'
      points = BREW_DONE_IT_RULES.points.relatedStyle
      awardedTypes.add('style')
    } else {
      incorrectPenalties += BREW_DONE_IT_RULES.incorrectGuessPenalty
    }
    pointsAwarded += Math.max(0, points)
    items.push({ type: guess.type, id, outcome, points, consumesAttempt: true })
  }

  const questionCost = questionCount * BREW_DONE_IT_RULES.questionCost
  const rawTotal = pointsAwarded - incorrectPenalties - questionCost
  const total = Math.min(BREW_DONE_IT_RULES.maximumTotal, Math.max(BREW_DONE_IT_RULES.minimumTotal, rawTotal))
  return {
    version: BREW_DONE_IT_SCORING_VERSION,
    total,
    breakdown: { pointsAwarded, incorrectGuessPenalties: -incorrectPenalties, questionCosts: -questionCost, rawTotal },
    attempts: {
      accepted: acceptedAttempts,
      remaining: BREW_DONE_IT_RULES.maxGuesses - acceptedAttempts,
      exhausted: acceptedAttempts === BREW_DONE_IT_RULES.maxGuesses
    },
    completed,
    items
  }
}