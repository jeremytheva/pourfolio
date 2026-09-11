import { calculateBrewDoneItDeductionScore } from './brewDoneItDeductionScoring.js'

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

const calculateV2Score = ({ correct, questionCount = 0, incorrectGuessCount = 0 }) => {
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
      questionPenalty: questionPenalty === 0 ? 0 : -questionPenalty,
      incorrectGuessPenalty: incorrectGuessPenalty === 0 ? 0 : -incorrectGuessPenalty,
      rawTotal
    })
  })
}

/**
 * Compatibility dispatcher while the contained v2 recovery code and v3 deduction
 * code coexist. V2 callers continue to receive the unchanged 2.0.0 contract.
 * V3 callers are identified only by v3-specific outcome keys and are delegated to
 * the separately versioned deduction scorer.
 */
export const calculateBrewDoneItRoundScore = (input = {}) => {
  const usesDeductionScoring = ['breweryCorrect', 'beerCorrect', 'styleCorrect', 'incorrectFormalGuessCount']
    .some((key) => Object.hasOwn(input, key))
  return usesDeductionScoring ? calculateBrewDoneItDeductionScore(input) : calculateV2Score(input)
}
