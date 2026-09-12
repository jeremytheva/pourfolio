export const BREW_DONE_IT_DEDUCTION_SCORING_VERSION = '3.0.0'

export const BREW_DONE_IT_DEDUCTION_RULES = Object.freeze({
  maximumRoundPoints: 10,
  minimumRoundPoints: 0,
  breweryPoints: 4,
  exactBeerPoints: 6,
  styleFallbackPoints: 3,
  incorrectFormalGuessCost: 1,
  maxFormalSubmissions: 20
})

const requireCount = (value, label) => {
  if (!Number.isSafeInteger(value) || value < 0 || value > BREW_DONE_IT_DEDUCTION_RULES.maxFormalSubmissions) {
    throw new RangeError(`${label} must be between 0 and ${BREW_DONE_IT_DEDUCTION_RULES.maxFormalSubmissions}.`)
  }
  return value
}

/**
 * Brew Done It v3 scores solved outcomes, not conversation or deduction notes.
 * The exact-beer component and style fallback are mutually exclusive.
 */
export const calculateBrewDoneItDeductionScore = ({
  breweryCorrect = false,
  beerCorrect = false,
  styleCorrect = false,
  incorrectFormalGuessCount = 0
} = {}) => {
  const incorrectFormalGuesses = requireCount(incorrectFormalGuessCount, 'Incorrect formal guess count')
  const exactBeerSolved = Boolean(beerCorrect)
  const brewerySolved = Boolean(breweryCorrect) || exactBeerSolved
  const styleFallbackSolved = Boolean(styleCorrect) && !exactBeerSolved

  const breweryPoints = brewerySolved ? BREW_DONE_IT_DEDUCTION_RULES.breweryPoints : 0
  const exactBeerPoints = exactBeerSolved ? BREW_DONE_IT_DEDUCTION_RULES.exactBeerPoints : 0
  const styleFallbackPoints = styleFallbackSolved ? BREW_DONE_IT_DEDUCTION_RULES.styleFallbackPoints : 0
  const basePoints = breweryPoints + exactBeerPoints + styleFallbackPoints
  const penalty = incorrectFormalGuesses * BREW_DONE_IT_DEDUCTION_RULES.incorrectFormalGuessCost
  const total = Math.max(
    BREW_DONE_IT_DEDUCTION_RULES.minimumRoundPoints,
    Math.min(BREW_DONE_IT_DEDUCTION_RULES.maximumRoundPoints, basePoints - penalty)
  )

  return Object.freeze({
    version: BREW_DONE_IT_DEDUCTION_SCORING_VERSION,
    total,
    breweryCorrect: brewerySolved,
    beerCorrect: exactBeerSolved,
    styleCorrect: styleFallbackSolved,
    breakdown: Object.freeze({
      breweryPoints,
      exactBeerPoints,
      styleFallbackPoints,
      incorrectFormalGuessPenalty: penalty === 0 ? 0 : -penalty,
      basePoints
    })
  })
}
