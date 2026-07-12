import { nocodeBackend } from '../lib/nocodeBackend'

export const COLLECTIONS = {
  beverages: 'beverages_pf2025',
  producers: 'producers_pf2025',
  profiles: 'profiles',
  ratings: 'ratings_pf2025'
}

const getUniqueIds = (records, key) => [...new Set((records || []).map((record) => record?.[key]).filter(Boolean))]

const indexById = async (collection, ids) => {
  const entries = await Promise.all(ids.map(async (id) => {
    const { data } = await nocodeBackend.get(collection, id)
    return [id, data || null]
  }))

  return new Map(entries)
}

export const pickProducerSummary = (producer, fields = ['name']) => {
  if (!producer) return null
  return fields.reduce((summary, field) => ({ ...summary, [field]: producer[field] }), {})
}

export const pickProfileSummary = (profile, fields = ['name', 'avatar_url']) => {
  if (!profile) return null
  return fields.reduce((summary, field) => ({ ...summary, [field]: profile[field] }), {})
}

export const pickBeverageSummary = (beverage) => {
  if (!beverage) return null
  return {
    name: beverage.name,
    style: beverage.style,
    type: beverage.type,
    producer_id: beverage.producer_id,
    producers_pf2025: beverage.producers_pf2025 || null
  }
}

export const attachProducerToBeverage = async (beverage, fields = ['name', 'location', 'type']) => {
  if (!beverage?.producer_id) return beverage
  const { data: producer } = await nocodeBackend.get(COLLECTIONS.producers, beverage.producer_id)
  return { ...beverage, producers_pf2025: pickProducerSummary(producer, fields) }
}

export const attachProducersToBeverages = async (beverages = [], fields = ['name', 'location', 'type']) => {
  const producersById = await indexById(COLLECTIONS.producers, getUniqueIds(beverages, 'producer_id'))
  return beverages.map((beverage) => ({
    ...beverage,
    producers_pf2025: pickProducerSummary(producersById.get(beverage.producer_id), fields)
  }))
}

export const attachProfileToRecord = async (record, fields = ['name', 'avatar_url']) => {
  if (!record?.user_id) return record
  const { data: profile } = await nocodeBackend.get(COLLECTIONS.profiles, record.user_id)
  return { ...record, profiles: pickProfileSummary(profile, fields) }
}

export const attachProfilesToRecords = async (records = [], fields = ['name', 'avatar_url']) => {
  const profilesById = await indexById(COLLECTIONS.profiles, getUniqueIds(records, 'user_id'))
  return records.map((record) => ({
    ...record,
    profiles: pickProfileSummary(profilesById.get(record.user_id), fields)
  }))
}

export const attachBeverageToRating = async (rating) => {
  if (!rating?.beverage_id) return rating
  const { data: beverage } = await nocodeBackend.get(COLLECTIONS.beverages, rating.beverage_id)
  if (!beverage) return { ...rating, beverages_pf2025: null }

  const hydratedBeverage = await attachProducerToBeverage(beverage, ['name'])
  return { ...rating, beverages_pf2025: pickBeverageSummary(hydratedBeverage) }
}

export const attachBeveragesToRatings = async (ratings = []) => {
  const beveragesById = await indexById(COLLECTIONS.beverages, getUniqueIds(ratings, 'beverage_id'))
  const beveragesWithProducers = await attachProducersToBeverages(
    [...beveragesById.values()].filter(Boolean),
    ['name']
  )
  const hydratedById = new Map(beveragesWithProducers.map((beverage) => [beverage.id, beverage]))

  return ratings.map((rating) => ({
    ...rating,
    beverages_pf2025: pickBeverageSummary(hydratedById.get(rating.beverage_id))
  }))
}
