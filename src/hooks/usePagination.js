import { useState, useMemo } from 'react'

export function usePagination(data, itemsPerPage = 12) {
  const [currentPage, setCurrentPage] = useState(1)

  const paginationInfo = useMemo(() => {
    const totalItems = data.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
    const currentItems = data.slice(startIndex, endIndex)

    return {
      currentItems,
      currentPage,
      totalPages,
      totalItems,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      startIndex: startIndex + 1,
      endIndex
    }
  }, [data, currentPage, itemsPerPage])

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, paginationInfo.totalPages)))
  }

  const nextPage = () => {
    if (paginationInfo.hasNextPage) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const prevPage = () => {
    if (paginationInfo.hasPrevPage) {
      setCurrentPage(prev => prev - 1)
    }
  }

  const resetPage = () => {
    setCurrentPage(1)
  }

  return {
    ...paginationInfo,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
    setCurrentPage
  }
}