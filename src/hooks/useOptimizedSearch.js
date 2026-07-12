import { useState, useEffect, useMemo } from 'react'
import { debounce } from '../utils/performance'

export function useOptimizedSearch(data, searchFields = ['name'], minSearchLength = 2) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  // Debounce search term updates
  const debouncedSetSearch = useMemo(
    () => debounce((term) => setDebouncedSearchTerm(term), 300),
    []
  )

  useEffect(() => {
    debouncedSetSearch(searchTerm)
  }, [searchTerm, debouncedSetSearch])

  // Memoized search results
  const searchResults = useMemo(() => {
    if (!debouncedSearchTerm || debouncedSearchTerm.length < minSearchLength) {
      return data
    }

    const searchLower = debouncedSearchTerm.toLowerCase()
    
    return data.filter(item => 
      searchFields.some(field => {
        const value = getNestedValue(item, field)
        return value && value.toString().toLowerCase().includes(searchLower)
      })
    )
  }, [data, debouncedSearchTerm, searchFields, minSearchLength])

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching: searchTerm !== debouncedSearchTerm
  }
}

// Helper function to get nested object values
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}