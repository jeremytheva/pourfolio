import React, { useState, useMemo, useEffect } from 'react';

// Performance optimization utilities

// Debounce function for search inputs
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Throttle function for scroll events
export function throttle(func, limit) {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Lazy loading utility for images
export function lazyLoadImages() {
  const images = document.querySelectorAll('img[data-src]')
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target
        img.src = img.dataset.src
        img.classList.remove('lazy')
        observer.unobserve(img)
      }
    })
  })

  images.forEach(img => imageObserver.observe(img))
}

// Memory management for large datasets
export class DataCache {
  constructor(maxSize = 100) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.accessOrder = []
  }

  get(key) {
    if (this.cache.has(key)) {
      // Update access order
      this.accessOrder = this.accessOrder.filter(k => k !== key)
      this.accessOrder.push(key)
      return this.cache.get(key)
    }
    return null
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Remove least recently used item
      const lruKey = this.accessOrder.shift()
      this.cache.delete(lruKey)
    }

    this.cache.set(key, value)
    this.accessOrder = this.accessOrder.filter(k => k !== key)
    this.accessOrder.push(key)
  }

  clear() {
    this.cache.clear()
    this.accessOrder = []
  }

  size() {
    return this.cache.size
  }
}

// Batch operations utility
export class BatchProcessor {
  constructor(batchSize = 10, delay = 100) {
    this.batchSize = batchSize
    this.delay = delay
    this.queue = []
    this.processing = false
  }

  add(item) {
    this.queue.push(item)
    if (!this.processing) {
      this.process()
    }
  }

  async process() {
    this.processing = true

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize)
      
      try {
        await this.processBatch(batch)
      } catch (error) {
        console.error('Batch processing error:', error)
      }

      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay))
      }
    }

    this.processing = false
  }

  async processBatch(batch) {
    // Override this method in subclasses
    console.log('Processing batch:', batch)
  }
}

// Virtual scrolling utility for large lists
export function useVirtualScrolling(items, itemHeight = 100, containerHeight = 600) {
  const [scrollTop, setScrollTop] = useState(0)
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    )
    
    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    }
  }, [items, itemHeight, containerHeight, scrollTop])

  return {
    visibleItems,
    onScroll: (e) => setScrollTop(e.target.scrollTop)
  }
}

// Image optimization utility
export function optimizeImageUrl(url, width = 400, height = 400, quality = 80) {
  if (!url || typeof url !== 'string') return url
  
  // Check if it's an Unsplash URL and add optimization parameters
  if (url.includes('unsplash.com')) {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}w=${width}&h=${height}&fit=crop&q=${quality}&auto=format`
  }
  
  return url
}

// Component performance monitoring
export function withPerformanceMonitoring(WrappedComponent, componentName) {
  return function PerformanceMonitoredComponent(props) {
    useEffect(() => {
      const startTime = performance.now()
      
      return () => {
        const endTime = performance.now()
        const renderTime = endTime - startTime
        
        if (renderTime > 100) { // Log slow renders
          console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
        }
      }
    })

    return React.createElement(WrappedComponent, props);
  }
}