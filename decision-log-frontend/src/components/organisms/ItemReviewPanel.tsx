/**
 * Review panel of the item drilldown (Story 12.6): approve / reject / edit, and compare with or
 * restore what the AI extracted. Reviewers (the owning organization's admins) get the actions;
 * everyone who receives the AI original can read it.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X, Pencil, RotateCcw } from 'lucide-react'
import { useEditReviewedItem, useRestoreOriginal, useReviewItem } from '../../hooks/useItemReview'
import { ReviewStatusBadge } from '../atoms/ReviewStatusBadge'
import { formatDate } from '../../lib/utils'
import type { ProjectItem } from '../../types/projectItem'

interface ItemReviewPanelProps {
  item: ProjectItem
  canReview?: boolean
}

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '')

export function ItemReviewPanel({ item, canReview }: ItemReviewPanelProps) {
  const { t } = useTranslation('item')
  const review = useReviewItem(item.project_id)
  const edit = useEditReviewedItem(item.project_id)
  const restore = useRestoreOriginal(item.project_id)
  const [editing, setEditing] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const [form, setForm] = useState({ title: '', statement: '', why: '', owner: '', due: '' })

  const status = item.review_status ?? 'approved'
  const original = item.original
  if (!canReview && !original) return null

  const busy = review.isLoading || edit.isLoading || restore.isLoading
  const failed = review.isError || edit.isError || restore.isError

  const startEdit = () => {
    setForm({
      title: item.title ?? '',
      statement: item.statement,
      why: item.why ?? '',
      owner: item.owner ?? '',
      due: toDateInput(item.due_date),
    })
    setEditing(true)
  }

  const save = () => {
    edit.mutate(
      {
        itemId: item.id,
        edits: {
          title: form.title || null,
          statement: form.statement,
          why: form.why,
          owner: form.owner || null,
          due_date: form.due || null,
        },
      },
      { onSuccess: () => setEditing(false) },
    )
  }

  const field = (key: keyof typeof form, label: string, multiline = false, type = 'text') => (
    <label className="block text-sm">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {multiline ? (
        <textarea
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      )}
    </label>
  )

  const originalRows: Array<[string, string | null | undefined]> = original
    ? [
        [t('review.fields.title'), original.title],
        [t('review.fields.statement'), original.statement],
        [t('review.fields.why'), original.why],
        [t('review.fields.owner'), original.owner],
        [t('review.fields.dueDate'), original.due_date ? formatDate(original.due_date) : null],
      ]
    : []

  return (
    <section className="mx-6 mb-4 rounded-lg border border-gray-200 bg-white overflow-hidden" data-testid="item-review-panel">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('review.heading')}</h3>
        <span className="text-sm font-medium text-gray-700">{t(`review.status.${status}`)}</span>
        <ReviewStatusBadge edited={item.is_edited} />
        {item.reviewed_by_name && status !== 'pending' && (
          <span className="text-xs text-gray-500">
            {t('review.reviewedBy', { status: t(`review.status.${status}`), name: item.reviewed_by_name })}
          </span>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {canReview && !editing && (
          <div className="flex flex-wrap gap-2">
            {status !== 'approved' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => review.mutate({ itemId: item.id, status: 'approved' })}
                className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                {t('review.approve')}
              </button>
            )}
            {status !== 'rejected' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => review.mutate({ itemId: item.id, status: 'rejected' })}
                className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <X className="w-4 h-4" aria-hidden="true" />
                {t('review.reject')}
              </button>
            )}
            {status !== 'pending' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => review.mutate({ itemId: item.id, status: 'pending' })}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('review.backToPending')}
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={startEdit}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Pencil className="w-4 h-4" aria-hidden="true" />
              {t('review.edit')}
            </button>
          </div>
        )}

        {canReview && editing && (
          <div className="space-y-2">
            {field('title', t('review.fields.title'))}
            {field('statement', t('review.fields.statement'), true)}
            {field('why', t('review.fields.why'), true)}
            {field('owner', t('review.fields.owner'))}
            {field('due', t('review.fields.dueDate'), false, 'date')}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy || !form.statement.trim()}
                onClick={save}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {edit.isLoading ? t('review.saving') : t('review.save')}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('review.cancel')}
              </button>
            </div>
          </div>
        )}

        {original && (
          <div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowOriginal(!showOriginal)}
                aria-expanded={showOriginal}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                {showOriginal ? t('review.hideOriginal') : t('review.showOriginal')}
              </button>
              {canReview && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => restore.mutate({ itemId: item.id })}
                  className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900 hover:underline disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('review.restore')}
                </button>
              )}
            </div>
            {showOriginal && (
              <div className="mt-2 rounded-md bg-gray-50 border border-gray-200 px-3 py-2 space-y-1.5" data-testid="item-original">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('review.originalHeading')}</p>
                {originalRows.map(([label, value]) => (
                  <p key={label} className="text-sm text-gray-700">
                    <span className="font-medium">{label}:</span> {value || t('review.empty')}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {failed && <p role="alert" className="text-sm text-red-600">{t('review.error')}</p>}
      </div>
    </section>
  )
}
