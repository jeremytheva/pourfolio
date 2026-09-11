export const BREW_DONE_IT_SCORING_VERSION = '3.0.0'

export const BREW_DONE_IT_RULES = Object.freeze({
  maximumRoundPoints: 10,
  breweryPoints: 4,
  exactBeerPoints: 6,
  styleFallbackPoints: 3,
  incorrectFormalGuessCost: 1,
  minimumRoundPoints: 0,
  maxTurns: 20,
  // Legacy v2 compatibility only. Spoken questions and deduction notes are free
  // in v3 and are not counted toward score.
  maxQuestions: 10,
  questionCost: 0,
  incorrectGuessCost: 1
})

const requireCount = (value, label, maximum = BREW_DONE_IT_RULES.maxTurns) => {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new RangeError(`${label} must be between 0 and ${maximum}.`)
  }
  return value
}

/**
 * Brew Done It v3 scores outcomes, not conversation.
 *
 * - identifying the brewery is worth 4 points;
 * - identifying the exact beer is worth 6 additional points;
 * - when the exact beer cannot be solved, identifying the style/category is worth
 *   3 points instead of the exact-beer component;
 * - ordinary yes/no questions and deduction notes are free;
 * - each incorrect formal brewery/beer/style submission costs one point, clamped
 *   so the round can never score below zero.
 *
 * `correct`, `questionCount` and `incorrectGuessCount` are accepted only so the
 * contained superseded v2 handlers remain source-compatible until removed. A v2
 * correct beer maps to brewery+beer correct under v3 and questions have no cost.
 */
export const calculateBrewDoneItRoundScore = ({
  breweryCorrect,
  beerCorrect,
  styleCorrect = false,
  incorrectFormalGuessCount,
  correct,
  incorrectGuessCount = 0
} = {}) => {
  const resolvedBeerCorrect = beerCorrect === undefined ? Boolean(correct) : Boolean(beerCorrect)
  const resolvedBreweryCorrect = breweryCorrect === undefined ? Boolean(correct) : Boolean(breweryCorrect)
  const resolvedStyleCorrect = Boolean(styleCorrect) && !resolvedBeerCorrect
  const incorrectFormalGuesses = requireCount(
    incorrectFormalGuessCount === undefined ? incorrectGuessCount : incorrectFormalGuessCount,
    'Incorrect formal guess count'
  )

  const breweryPoints = resolvedBreweryCorrect ? BREW_DONE_IT_RULES.breweryPoints : 0
  const beerOrStylePoints = resolvedBeerCorrect
    ? BREW_DONE_IT_RULES.exactBeerPoints
    : resolvedStyleCorrect
      ? BREW_DONE_IT_RULES.styleFallbackPoints
      : 0
  const basePoints = breweryPoints + beerOrStylePoints
  const penalty = incorrectFormalGuesses * BREW_DONE_IT_RULES.incorrectFormalGuessCost
  const total = Math.max(
    BREW_DONE_IT_RULES.minimumRoundPoints,
    Math.min(BREW_DONE_IT_RULES.maximumRoundPoints, basePoints - penalty)
  )

  return Object.freeze({
    version: BREW_DONE_IT_SCORING_VERSION,
    total,
    breweryCorrect: resolvedBreweryCorrect,
    beerCorrect: resolvedBeerCorrect,
    styleCorrect: resolvedStyleCorrect,
    breakdown: Object.freeze({
      breweryPoints,
      exactBeerPoints: resolvedBeerCorrect ? BREW_DONE_IT_RULES.exactBeerPoints : 0,
      styleFallbackPoints: resolvedStyleCorrect ? BREW_DONE_IT_RULES.styleFallbackPoints : 0,
      incorrectFormalGuessPenalty: penalty === 0 ? 0 : -penalty,
      basePoints
    })
  })
}
