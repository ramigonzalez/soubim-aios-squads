/**
 * "Externo" badge (Story 12.15): a person from outside the organization, invited to a project.
 * Shown wherever such a person appears (team page, project's external people, author of items / meetings).
 */
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'

export function ExternalBadge({ className }: { className?: string }) {
  const { t } = useTranslation('common')
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 whitespace-nowrap',
        className,
      )}
      title={t('external.hint')}
      data-testid="external-badge"
    >
      {t('external.badge')}
    </span>
  )
}
