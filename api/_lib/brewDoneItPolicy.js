const GAME_FIELDS = Object.freeze([
  'id',
  'creator_participant_id',
  'opponent_participant_id',
  'creator_history_clues_enabled',
  'opponent_history_clues_enabled',
  'status',
  'current_round_number',
  'created_at',
  'joined_at',
  'last_activity_at',
  'expires_at',
  'archived_at',
  'version'
])

const ROUND_FIELDS = Object.freeze([
  'id',
  'game_id',
  'round_number',
  'selector_participant_id',
  'guesser_participant_id',
  'status',
  'turn_sequence',
  'max_turns',
  'question_count',
  'incorrect_guess_count',
  'incorrect_formal_guess_count',
  'brewery_correct',
  'style_correct',
  'beer_correct',
  'created_at',
  'started_at',
  'completed_at',
  'completion_reason',
  'scoring_rules_version',
  'awarded_points',
  'score_breakdown',
  'version'
])

const GUESS_FIELDS = Object.freeze([
  'id',
  'round_id',
  'turn_sequence',
  'guess_type',
  'guessed_product_id',
  'guessed_producer_id',
  'guessed_category_id',
  'is_correct',
  'created_at'
])

const DEDUCTION_FIELDS = Object.freeze([
  'id',
  'round_id',
  'dimension',
  'answer',
  'value_text',
  'reference_id',
  'numeric_value',
  'created_at',
  'updated_at'
])

const QUESTION_FIELDS = Object.freeze([
  'id',
  'round_id',
  'turn_sequence',
  'question_type',
  'reference_id',
  'threshold',
  'answer',
  'created_at'
])

// Legacy v2 controlled-question contract. v3 retains this only so historical
// contained code remains readable; the v3 browser surface does not call it.
export const BREW_DONE_IT_QUESTION_TYPES = Object.freeze({
  producer: 'producer',
  category: 'category',
  abvAtLeast: 'abv_at_least',
  ibuAtLeast: 'ibu_at_least',
  collaboration: 'collaboration'
})

export const BREW_DONE_IT_ABV_THRESHOLDS = Object.freeze([4, 5, 6, 7, 8, 10])
export const BREW_DONE_IT_IBU_THRESHOLDS = Object.freeze([20, 40, 60, 80])

export const BREW_DONE_IT_OUTCOME_TYPES = Object.freeze({
  brewery: 'brewery',
  beer: 'beer',
  style: 'style'
})

export const BREW_DONE_IT_DEDUCTION_DIMENSIONS = Object.freeze({
  breweryCountry: 'brewery_country',
  breweryState: 'brewery_state',
  breweryPreviouslyRated: 'brewery_previously_rated',
  breweryRuledOut: 'brewery_ruled_out',
  style: 'style',
  abvAtLeast: 'abv_at_least',
  abvBelow: 'abv_below',
  ibuAtLeast: 'ibu_at_least',
  ibuBelow: 'ibu_below',
  collaboration: 'collaboration',
  dark: 'dark',
  barrelAged: 'barrel_aged',
  beerRuledOut: 'beer_ruled_out'
})

export const BREW_DONE_IT_DEDUCTION_ANSWERS = Object.freeze(['yes', 'no', 'unknown'])

const pickFields = (record, fields) => {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null
  return fields.reduce((result, field) => {
    if (record[field] !== undefined) result[field] = record[field]
    return result
  }, {})
}

const requestError = (message) => {
  const error = new Error(message)
  error.status = 400
  return error
}

const requirePlainObject = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw requestError('Request data is invalid.')
  return input
}

const positiveId = (value, label) => {
  const result = String(value ?? '').trim()
  if (!/^[1-9]\d*$/.test(result)) throw requestError(`${label} is invalid.`)
  return result
}

const optionalText = (value, label, maxLength = 120) => {
  if (value === undefined || value === null || value === '') return null
  const text = String(value).trim()
  if (!text || text.length > maxLength || [...text].some((character) => character.codePointAt(0) < 32)) {
    throw requestError(`${label} is invalid.`)
  }
  return text
}

const requiredText = (value, label, maxLength = 120) => {
  const text = optionalText(value, label, maxLength)
  if (!text) throw requestError(`${label} is required.`)
  return text
}

const requiredNumber = (value, label, maximum) => {
  if (value === undefined || value === null || value === '') throw requestError(`${label} is required.`)
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > maximum) throw requestError(`${label} is invalid.`)
  return numeric
}

export const sanitiseBrewDoneItCreateInput = (input) => {
  const body = requirePlainObject(input)
  return { productId: positiveId(body.productId, 'Product identifier') }
}

export const sanitiseBrewDoneItJoinInput = (input) => {
  const body = requirePlainObject(input)
  const inviteCode = String(body.inviteCode ?? '').trim()
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(inviteCode)) throw requestError('Invitation code is invalid.')
  return { inviteCode }
}

export const sanitiseBrewDoneItGuessInput = (input) => {
  const body = requirePlainObject(input)
  return { productId: positiveId(body.productId, 'Product identifier') }
}

export const sanitiseBrewDoneItOutcomeInput = (input) => {
  const body = requirePlainObject(input)
  const guessType = String(body.guessType ?? '').trim()
  if (!Object.values(BREW_DONE_IT_OUTCOME_TYPES).includes(guessType)) throw requestError('Outcome guess type is invalid.')
  return {
    guessType,
    referenceId: positiveId(body.referenceId, 'Guess reference')
  }
}

export const sanitiseBrewDoneItDeductionInput = (input) => {
  const body = requirePlainObject(input)
  const dimension = String(body.dimension ?? '').trim()
  if (!Object.values(BREW_DONE_IT_DEDUCTION_DIMENSIONS).includes(dimension)) throw requestError('Deduction dimension is invalid.')

  const answer = String(body.answer ?? '').trim().toLowerCase()
  if (!BREW_DONE_IT_DEDUCTION_ANSWERS.includes(answer)) throw requestError('Deduction answer is invalid.')

  const base = { dimension, answer, valueText: null, referenceId: null, numericValue: null }

  if ([BREW_DONE_IT_DEDUCTION_DIMENSIONS.breweryCountry, BREW_DONE_IT_DEDUCTION_DIMENSIONS.breweryState].includes(dimension)) {
    return { ...base, valueText: requiredText(body.valueText, 'Deduction value') }
  }

  if ([BREW_DONE_IT_DEDUCTION_DIMENSIONS.breweryRuledOut, BREW_DONE_IT_DEDUCTION_DIMENSIONS.beerRuledOut].includes(dimension)) {
    return { ...base, referenceId: positiveId(body.referenceId, 'Deduction reference') }
  }

  if (dimension === BREW_DONE_IT_DEDUCTION_DIMENSIONS.style) {
    return {
      ...base,
      referenceId: positiveId(body.referenceId, 'Style reference'),
      valueText: optionalText(body.valueText, 'Style label')
    }
  }

  if ([BREW_DONE_IT_DEDUCTION_DIMENSIONS.abvAtLeast, BREW_DONE_IT_DEDUCTION_DIMENSIONS.abvBelow].includes(dimension)) {
    return { ...base, numericValue: requiredNumber(body.numericValue, 'ABV deduction number', 100) }
  }

  if ([BREW_DONE_IT_DEDUCTION_DIMENSIONS.ibuAtLeast, BREW_DONE_IT_DEDUCTION_DIMENSIONS.ibuBelow].includes(dimension)) {
    return { ...base, numericValue: requiredNumber(body.numericValue, 'IBU deduction number', 1000) }
  }

  // Previous-rating, collaboration, dark and barrel-aged deductions carry only
  // their tri-state answer. Extra client fields are intentionally discarded.
  return base
}

export const sanitiseBrewDoneItQuestionInput = (input) => {
  const body = requirePlainObject(input)
  const questionType = String(body.questionType ?? '').trim()
  if (!Object.values(BREW_DONE_IT_QUESTION_TYPES).includes(questionType)) throw requestError('Question type is invalid.')

  if (questionType === BREW_DONE_IT_QUESTION_TYPES.producer || questionType === BREW_DONE_IT_QUESTION_TYPES.category) {
    return { questionType, referenceId: positiveId(body.referenceId, 'Question reference'), threshold: null }
  }

  if (questionType === BREW_DONE_IT_QUESTION_TYPES.abvAtLeast) {
    const threshold = Number(body.threshold)
    if (!BREW_DONE_IT_ABV_THRESHOLDS.includes(threshold)) throw requestError('ABV threshold is invalid.')
    return { questionType, referenceId: null, threshold }
  }

  if (questionType === BREW_DONE_IT_QUESTION_TYPES.ibuAtLeast) {
    const threshold = Number(body.threshold)
    if (!BREW_DONE_IT_IBU_THRESHOLDS.includes(threshold)) throw requestError('IBU threshold is invalid.')
    return { questionType, referenceId: null, threshold }
  }

  return { questionType, referenceId: null, threshold: null }
}

export const projectBrewDoneItGame = (record) => pickFields(record, GAME_FIELDS)
export const projectBrewDoneItGuess = (record) => pickFields(record, GUESS_FIELDS)
export const projectBrewDoneItDeduction = (record) => pickFields(record, DEDUCTION_FIELDS)
export const projectBrewDoneItQuestion = (record) => pickFields(record, QUESTION_FIELDS)

export const projectBrewDoneItRound = (record, viewerId) => {
  const projected = pickFields(record, ROUND_FIELDS)
  const selectorViewing = String(record?.selector_participant_id) === String(viewerId)
  const roundEnded = ['completed', 'forfeited'].includes(record?.status)
  if (selectorViewing || roundEnded) projected.selected_product_id = record?.selected_product_id
  return projected
}

export const __testables = {
  GAME_FIELDS,
  ROUND_FIELDS,
  GUESS_FIELDS,
  DEDUCTION_FIELDS,
  QUESTION_FIELDS,
  positiveId,
  requiredNumber,
  requiredText
}
