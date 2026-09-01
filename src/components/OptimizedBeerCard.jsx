import React, { memo } from 'react'
import { FiArrowRight } from 'react-icons/fi'
import { Link } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'

const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"%3E%3Crect width="640" height="480" fill="%23fef3c7"/%3E%3Ctext x="320" y="250" text-anchor="middle" font-family="sans-serif" font-size="42" fill="%2392400e"%3EPourfolio%3C/text%3E%3C/svg%3E'

const OptimizedBeerCard = memo(function OptimizedBeerCard({ product }) {
  const category = product.declared_category || product.category?.category_name || 'Beer'
  const producer = product.producer?.producer_name || 'Producer not recorded'
  const hasProductImage = Boolean(product.product_image)

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <img
        src={product.product_image || FALLBACK_IMAGE}
        alt={hasProductImage ? `${product.product_name} by ${producer}` : ''}
        loading="lazy"
        className="aspect-[4/3] w-full bg-amber-50 object-cover"
      />
      <div className="p-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">{category}</p>
        <h2 className="line-clamp-2 text-lg font-semibold text-gray-900">{product.product_name}</h2>
        <p className="mt-1 truncate text-sm text-gray-600">{producer}</p>
        <dl className="mt-4 flex gap-5 text-sm">
          {product.abv !== null && product.abv !== undefined && (
            <div>
              <dt className="text-gray-500">ABV</dt>
              <dd className="font-medium text-gray-800">{product.abv}%</dd>
            </div>
          )}
          {product.ibu !== null && product.ibu !== undefined && (
            <div>
              <dt className="text-gray-500">IBU</dt>
              <dd className="font-medium text-gray-800">{product.ibu}</dd>
            </div>
          )}
        </dl>
        <Link
          to={`/products/${product.id}`}
          className="mt-5 inline-flex items-center rounded font-medium text-amber-700 hover:text-amber-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
        >
          View product
          <SafeIcon icon={FiArrowRight} className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </article>
  )
})

export default OptimizedBeerCard
