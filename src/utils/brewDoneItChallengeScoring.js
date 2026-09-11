export const BREW_DONE_IT_SCORING_VERSION = '2.0.0'

export const BREW_DONE_IT_RULES = Object.freeze({
  maximumRoundPoints: 10,
  minimumRoundPoints: 0,
  questionCost: 1,
  incorrectGuessCost: 1,
  maxTurns: 20,
  maxQuestions: 10
})

const requireCount = (value, label, maximum = BREW_DONE_IT_RULES.maxTurns) => {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new RangeError(`${label} must be between 0 and ${maximum}.`)
  }
  return value
}

/**
 * Brew Done It round scoring is intentionally simple and stable across devices.
 * Only the guesser can earn points. A correct beer guess starts at 10 points and
 * costs one point for each earlier controlled question and incorrect beer guess.
 * A round that ends without a correct beer guess awards zero points.
 */
export const calculateBrewDoneItRoundScore = ({
  correct,
  questionCount = 0,
  incorrectGuessCount = 0
}) => {
  const questions = requireCount(questionCount, 'Question count', BREW_DONE_IT_RULES.maxQuestions)
  const incorrectGuesses = requireCount(incorrectGuessCount, 'Incorrect guess count')
  if (questions + incorrectGuesses > BREW_DONE_IT_RULES.maxTurns) {
    throw new RangeError(`Combined scored actions cannot exceed ${BREW_DONE_IT_RULES.maxTurns}.`)
  }

  const questionPenalty = questions * BREW_DONE_IT_RULES.questionCost
  const incorrectGuessPenalty = incorrectGuesses * BREW_DONE_IT_RULES.incorrectGuessCost
  const rawTotal = correct
    ? BREW_DONE_IT_RULES.maximumRoundPoints - questionPenalty - incorrectGuessPenalty
    : 0
  const total = Math.max(
    BREW_DONE_IT_RULES.minimumRoundPoints,
    Math.min(BREW_DONE_IT_RULES.maximumRoundPoints, rawTotal)
  )

  return Object.freeze({
    version: BREW_DONE_IT_SCORING_VERSION,
    total,
    correct: Boolean(correct),
    breakdown: Object.freeze({
      startingPoints: correct ? BREW_DONE_IT_RULES.maximumRoundPoints : 0,
      questionPenalty: -questionPenalty,
      incorrectGuessPenalty: -incorrectGuessPenalty,
      rawTotal
    })
  })
}
