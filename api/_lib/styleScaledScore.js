import { completedRatingTotal } from '../../src/lib/completedRatingContract.js'
import { calculateScaledScore } from '../../src/lib/ratingFormulaV1.js'

export const STYLE_RANK_TEXT_MIN_SAMPLE = 20

export const styleScaledScoreForRating = () => null

export const __testables = { completedRatingTotal, calculateScaledScore }
