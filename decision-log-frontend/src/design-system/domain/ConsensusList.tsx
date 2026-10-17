import { useTranslation } from 'react-i18next'
import type { Discipline } from '../../types/projectItem'
import { cn } from '../cn'
import { Icons } from '../icons'
import { DisciplineMarker } from './Discipline'

/** Platform values. MIXED ("Com ressalvas") arrives with the extraction change (REVAMP-MAPPING §6.1 #7). */
export type ConsensusStatus = 'AGREE' | 'MIXED' | 'DISAGREE' | 'ABSTAIN'

export interface ConsensusRow {
  discipline: Discipline | string
  status: ConsensusStatus
  notes?: string | null
}

const STATE: Record<ConsensusStatus, { Icon: (typeof Icons)[keyof typeof Icons]; className: string }> = {
  AGREE: { Icon: Icons.agree, className: 'text-success' },
  MIXED: { Icon: Icons.mixed, className: 'text-warning-ink' },
  DISAGREE: { Icon: Icons.dissent, className: 'text-danger-ink' },
  ABSTAIN: { Icon: Icons.abstain, className: 'text-ink-3' },
}

/** "CONSENSO" + summary, then one row per discipline with icon + text (COMPONENTS.md §3). */
export function ConsensusList({ rows, className }: { rows: ConsensusRow[]; className?: string }) {
  const { t } = useTranslation('ui')
  if (rows.length === 0) return null
  const agree = rows.filter((r) => r.status === 'AGREE').length
  const summaryClass = rows.some((r) => r.status === 'DISAGREE')
    ? 'text-danger-ink'
    : rows.some((r) => r.status === 'MIXED')
      ? 'text-warning-ink'
      : agree === rows.length
        ? 'text-success'
        : 'text-ink-2'
  return (
    <section className={cn('flex flex-col', className)}>
      <header className="mb-1 flex items-baseline justify-between gap-3">
        <h4 className="text-label uppercase text-ink-2">{t('consensus.label')}</h4>
        <span className={cn('text-caption font-semibold', summaryClass)}>{t('consensus.summary', { agree, total: rows.length })}</span>
      </header>
      <ul>
        {rows.map((row) => {
          const { Icon, className: tone } = STATE[row.status]
          return (
            <li key={row.discipline} className="flex flex-col justify-center gap-0.5 border-b border-line-soft py-2 last:border-b-0">
              <div className="flex min-h-5 items-center justify-between gap-3">
                <DisciplineMarker discipline={row.discipline} size="md" label="name" />
                <span className={cn('inline-flex shrink-0 items-center gap-1 text-small font-semibold', tone)}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  {t(`consensus.${row.status}`)}
                </span>
              </div>
              {row.notes && <p className="pl-4 text-caption text-ink-2">{row.notes}</p>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
