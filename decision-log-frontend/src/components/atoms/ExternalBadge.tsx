/**
 * "Externo" badge (Story 12.15): a person from outside the organization, invited to a project.
 * Shown wherever such a person appears (team page, project's external people, author of items / meetings).
 * Promem revamp: a neutral design-system Badge; the word carries the meaning, not the colour.
 */
import { useTranslation } from 'react-i18next'
import { Badge } from '../../design-system'

export function ExternalBadge({ className }: { className?: string }) {
  const { t } = useTranslation('common')
  return (
    <Badge className={className} title={t('external.hint')} data-testid="external-badge">
      {t('external.badge')}
    </Badge>
  )
}
