/**
 * Review badges (Story 12.6): "Pendente" (not reviewed yet), "Rejeitado" and "Editado".
 * Approved items show nothing but the "Editado" tag when a reviewer changed them.
 */
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'
import type { ReviewStatus } from '../../types/projectItem'

interface ReviewStatusBadgeProps {
  status?: ReviewStatus
  edited?: boolean
  className?: string
}

const BASE = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap flex-shrink-0'

export function ReviewStatusBadge({ status, edited, className }: ReviewStatusBadgeProps) {
  const { t } = useTranslation('item')
  const showStatus = status === 'pending' || status === 'rejected'
  if (!showStatus && !edited) return null

  return (
    <>
      {showStatus && (
        <span
          className={cn(BASE, status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700', className)}
          title={t(status === 'pending' ? 'review.pendingHint' : 'review.rejectedHint')}
          data-testid="review-status-badge"
        >
          {t(`review.status.${status}`)}
        </span>
      )}
      {edited && (
        <span
          className={cn(BASE, 'bg-blue-50 text-blue-700', className)}
          title={t('review.editedHint')}
          data-testid="edited-badge"
        >
          {t('review.edited')}
        </span>
      )}
    </>
  )
}
