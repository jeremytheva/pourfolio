const deductionMatches = (matches, answer) => answer === 'unknown' ? true : answer === 'yes' ? matches : !matches
const missing = (value) => value === null || value === undefined || value === ''

export const filterBrewDoneItBreweries = (breweries = [], deductions = [], { geographyAvailable = false } = {}) =>
  breweries.filter((brewery) => deductions.every((deduction) => {
    if (deduction.answer === 'unknown') return true
    if (deduction.dimension === 'brewery_state') {
      if (!geographyAvailable || (!brewery.state && !brewery.stateAcronym)) return true
      return deductionMatches([brewery.stateAcronym, brewery.state].includes(deduction.value_text), deduction.answer)
    }
    if (deduction.dimension === 'brewery_country') {
      if (!geographyAvailable || !brewery.country) return true
      return deductionMatches(brewery.country === deduction.value_text, deduction.answer)
    }
    if (deduction.dimension === 'brewery_previously_rated') {
      return deductionMatches(Boolean(brewery.previouslyRated), deduction.answer)
    }
    if (deduction.dimension === 'brewery_ruled_out') {
      if (deduction.answer !== 'yes') return true
      return String(brewery.id) !== String(deduction.reference_id)
    }
    return true
  }))

export const filterBrewDoneItBeers = (beers = [], deductions = [], breweryIds = new Set()) =>
  beers.filter((beer) => {
    // Missing producer attribution is unknown, not evidence that the beer belongs
    // outside the remaining brewery field.
    if (!missing(beer.producerId) && breweryIds.size && !breweryIds.has(String(beer.producerId))) return false

    return deductions.every((deduction) => {
      if (deduction.answer === 'unknown' || ['dark', 'barrel_aged'].includes(deduction.dimension)) return true

      if (deduction.dimension === 'beer_ruled_out') {
        if (deduction.answer !== 'yes') return true
        return String(beer.id) !== String(deduction.reference_id)
      }
      if (deduction.dimension === 'style') {
        if (missing(beer.categoryId)) return true
        return deductionMatches(String(beer.categoryId) === String(deduction.reference_id), deduction.answer)
      }
      if (deduction.dimension === 'abv_at_least') {
        if (missing(beer.abv)) return true
        return deductionMatches(Number(beer.abv) >= Number(deduction.numeric_value), deduction.answer)
      }
      if (deduction.dimension === 'abv_below') {
        if (missing(beer.abv)) return true
        return deductionMatches(Number(beer.abv) < Number(deduction.numeric_value), deduction.answer)
      }
      if (deduction.dimension === 'ibu_at_least') {
        if (missing(beer.ibu)) return true
        return deductionMatches(Number(beer.ibu) >= Number(deduction.numeric_value), deduction.answer)
      }
      if (deduction.dimension === 'ibu_below') {
        if (missing(beer.ibu)) return true
        return deductionMatches(Number(beer.ibu) < Number(deduction.numeric_value), deduction.answer)
      }
      if (deduction.dimension === 'collaboration') {
        if (missing(beer.collaboration)) return true
        return deductionMatches(Boolean(beer.collaboration), deduction.answer)
      }
      return true
    })
  })

export const __testables = { deductionMatches, missing }