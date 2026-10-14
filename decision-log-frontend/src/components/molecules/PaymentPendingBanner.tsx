import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { useActiveOrganization } from '../../hooks/useOrganizations'

/**
 * Story 12.13: the active organization's payment is pending (set by the platform operator). Access is
 * unchanged; this banner is the only effect. A blocked organization never gets here (no access at all).
 */
export function PaymentPendingBanner() {
  const { t } = useTranslation('nav')
  const { active } = useActiveOrganization()

  if (active?.status !== 'payment_pending') return null

  return (
    <div role="alert" className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <span>{t('paymentPending', { organization: active.name })}</span>
      </div>
    </div>
  )
}
