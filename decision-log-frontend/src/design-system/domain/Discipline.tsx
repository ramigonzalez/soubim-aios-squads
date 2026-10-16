import { useTranslation } from 'react-i18next'
import type { Discipline } from '../../types/projectItem'
import { cn } from '../cn'
import { disciplineMeta } from '../disciplines'
import { Tooltip } from '../primitives/Tooltip'

export interface DisciplineMarkerProps {
  discipline: Discipline | string
  /** sm 8 px (rows) · md 10 px (detail, filters) */
  size?: 'sm' | 'md'
  /** code "ARQ" (rows) · name "Arquitetura" (detail, filters, chips) · short (mobile chips) · none */
  label?: 'code' | 'name' | 'short' | 'none'
  className?: string
}

/** Discipline square + code or name. Colour is never shown alone. */
export function DisciplineMarker({ discipline, size = 'sm', label = 'code', className }: DisciplineMarkerProps) {
  const { t } = useTranslation('labels')
  const meta = disciplineMeta(discipline)
  const name = t(`discipline.${meta.key}`)
  const square = (
    <span
      aria-hidden
      className={cn('inline-block shrink-0 rounded-xs print:[print-color-adjust:exact]', size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5', meta.markerClass)}
    />
  )
  if (label === 'none') {
    return (
      <span role="img" aria-label={name} title={name} className={cn('inline-flex', className)}>
        {square}
      </span>
    )
  }
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)} title={label === 'code' ? name : undefined}>
      {square}
      {label === 'code' && (
        <>
          <span aria-hidden className="text-caption font-medium text-ink-2">{meta.code}</span>
          <span className="sr-only">{name}</span>
        </>
      )}
      {label === 'name' && <span className="truncate text-small font-medium text-ink">{name}</span>}
      {label === 'short' && <span className="truncate text-caption font-medium text-ink-soft">{t(`disciplineShort.${meta.key}`)}</span>}
    </span>
  )
}

export interface DisciplineListProps {
  disciplines: (Discipline | string)[]
  /** Codes shown before "+N" (2 in rows) */
  max?: number
  className?: string
}

/** Up to `max` codes in a row, then "+N" with a tooltip listing every discipline. */
export function DisciplineList({ disciplines, max = 2, className }: DisciplineListProps) {
  const { t } = useTranslation(['ui', 'labels'])
  const unique = Array.from(new Set(disciplines.map((d) => disciplineMeta(d).key)))
  const shown = unique.slice(0, max)
  const hidden = unique.length - shown.length
  const names = unique.map((d) => t(`labels:discipline.${d}`)).join(', ')
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2 overflow-hidden', className)}>
      {shown.map((d) => (
        <DisciplineMarker key={d} discipline={d} />
      ))}
      {hidden > 0 && (
        <Tooltip content={t('ui:disciplines.all', { names })}>
          <span tabIndex={0} aria-label={t('ui:disciplines.all', { names })} className="cursor-default text-caption text-ink-2">
            {t('ui:disciplines.more', { count: hidden })}
          </span>
        </Tooltip>
      )}
    </span>
  )
}
