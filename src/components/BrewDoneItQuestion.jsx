import React, { useMemo, useState } from 'react'

const thresholds = {
  abv_at_least: [4, 5, 6, 7, 8, 10],
  ibu_at_least: [20, 40, 60, 80]
}

export default function BrewDoneItQuestion({ products, busy, onAsk }) {
  const [questionType, setQuestionType] = useState('')
  const [referenceId, setReferenceId] = useState('')
  const [threshold, setThreshold] = useState('')

  const referenceChoices = useMemo(() => {
    if (questionType === 'producer') {
      return [...new Map(products
        .filter((item) => item.producer_id && item.producer?.producer_name)
        .map((item) => [String(item.producer_id), item.producer.producer_name])).entries()]
    }
    if (questionType === 'category') {
      return [...new Map(products
        .filter((item) => item.product_category_id && (item.category?.category_name || item.declared_category))
        .map((item) => [String(item.product_category_id), item.category?.category_name || item.declared_category])).entries()]
    }
    return []
  }, [products, questionType])

  const submit = (event) => {
    event.preventDefault()
    if (!questionType) return
    if ((questionType === 'producer' || questionType === 'category') && !referenceId) return
    if ((questionType === 'abv_at_least' || questionType === 'ibu_at_least') && !threshold) return
    onAsk({
      questionType,
      ...(referenceId ? { referenceId } : {}),
      ...(threshold ? { threshold: Number(threshold) } : {})
    })
  }

  return (
    <form onSubmit={submit}>
      <h3 className="text-lg font-semibold text-gray-900">Ask a controlled question</h3>
      <p className="mt-1 text-sm text-gray-600">Questions use public catalogue facts only. Each question costs one point if you later guess correctly.</p>
      <label className="mt-3 block text-sm font-medium text-gray-800">Question
        <select required value={questionType} onChange={(event) => { setQuestionType(event.target.value); setReferenceId(''); setThreshold('') }} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">Choose a question</option>
          <option value="producer">Is it made by this brewery?</option>
          <option value="category">Is it in this beer category?</option>
          <option value="abv_at_least">Is the ABV at least this high?</option>
          <option value="ibu_at_least">Is the IBU at least this high?</option>
          <option value="collaboration">Is it a collaboration?</option>
        </select>
      </label>

      {(questionType === 'producer' || questionType === 'category') && (
        <label className="mt-3 block text-sm font-medium text-gray-800">{questionType === 'producer' ? 'Brewery' : 'Category'}
          <select required value={referenceId} onChange={(event) => setReferenceId(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500">
            <option value="">Choose an option</option>
            {referenceChoices.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
          </select>
        </label>
      )}

      {(questionType === 'abv_at_least' || questionType === 'ibu_at_least') && (
        <label className="mt-3 block text-sm font-medium text-gray-800">Threshold
          <select required value={threshold} onChange={(event) => setThreshold(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500">
            <option value="">Choose a threshold</option>
            {thresholds[questionType].map((value) => <option value={value} key={value}>{value}{questionType === 'abv_at_least' ? '%' : ' IBU'}</option>)}
          </select>
        </label>
      )}

      <button disabled={busy || !questionType} className="mt-3 rounded-lg border border-amber-700 px-4 py-2 font-semibold text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-60">Ask question</button>
    </form>
  )
}
