import { differenceInCalendarDays } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { formatDay, toDate, type DateInput } from '../../lib/format'
import { Badge } from '../primitives/Badge'

export interface DueBadgeProps {
  due: DateInput
  done?: boolean
  /** Injected for tests and stories */
  today?: Date
  className?: string
}

/** Action due date: "até 13/02" · "atrasada · 10/02" (late = !done && due < today) · "concluída · 13/02". */
export function DueBadge({ due, done = false, today = new Date(), className }: DueBadgeProps) {
  const { t } = useTranslation('ui')
  const date = toDate(due)
  if (!date) return null
  const label = formatDay(date)
  if (done) return <Badge mono tone="muted" className={className}>{t('due.done', { date: label })}</Badge>
  if (differenceInCalendarDays(date, today) < 0) return <Badge mono tone="danger" className={className}>{t('due.late', { date: label })}</Badge>
  return <Badge mono tone="neutral" className={className}>{t('due.open', { date: label })}</Badge>
}
