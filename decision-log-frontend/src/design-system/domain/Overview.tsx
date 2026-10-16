import type { ReactNode } from 'react'
import { cn } from '../cn'
import { disciplineMeta } from '../disciplines'
import { useIsMobile } from '../useMediaQuery'

export interface OverviewTile<K extends string> {
  key: K
  value: ReactNode
  label: ReactNode
  note: ReactNode
  /** The note needs action (e.g. "1 atrasada"): danger-ink 600 */
  alert?: boolean
  /** Phones show three narrow tiles: only this short note ("1 atrasada"), if any */
  mobileNote?: ReactNode
}

/**
 * Three selectable tiles acting as tabs for the list below (COMPONENTS.md → OverviewTiles).
 * Phones (README §7): three in a row, the number above a two-line label.
 */
export function OverviewTiles<K extends string>({
  tiles,
  value,
  onValueChange,
  label,
}: {
  tiles: OverviewTile<K>[]
  value: K
  onValueChange: (key: K) => void
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="grid grid-cols-3 gap-2 md:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] md:gap-3">
      {tiles.map((tile) => {
        const selected = tile.key === value
        return (
          <button
            key={tile.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onValueChange(tile.key)}
            className={cn(
              'flex min-w-0 flex-col gap-1 rounded-lg border bg-surface px-3 py-3 text-left transition-colors duration-fast md:px-[18px] md:py-3.5',
              selected ? 'border-ink shadow-tab-active' : 'border-line hover:bg-surface-2',
            )}
          >
            <span className="flex flex-col gap-0.5 md:flex-row md:items-baseline md:gap-2">
              <span className="text-kpi text-ink">{tile.value}</span>
              <span className="text-small font-semibold text-ink [overflow-wrap:anywhere]">{tile.label}</span>
            </span>
            <span className={cn('hidden text-caption md:block', tile.alert ? 'font-semibold text-danger-ink' : 'text-ink-2')}>{tile.note}</span>
            {tile.mobileNote && (
              <span className={cn('text-caption md:hidden', tile.alert ? 'font-semibold text-danger-ink' : 'text-ink-2')}>{tile.mobileNote}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export interface OverviewRowProps {
  icon: ReactNode
  title: ReactNode
  /** Due badge after the title */
  badge?: ReactNode
  /** Line 2: source icon + "Revisão do projeto estrutural · Carlos" */
  meta: ReactNode
  disciplines?: ReactNode
  date?: ReactNode
  selected?: boolean
  onClick: () => void
}

/** Two-line row (COMPONENTS.md → OverviewRow): grid 20 · 1fr · auto · 48, min-height 52. */
export function OverviewRow({ icon, title, badge, meta, disciplines, date, selected, onClick }: OverviewRowProps) {
  // phones move the disciplines into line 2 (README §7)
  const mobile = useIsMobile()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected || undefined}
      className={cn(
        'grid min-h-row-2 max-md:min-h-14 w-full grid-cols-[20px_minmax(0,1fr)_auto_48px] items-center gap-3 border-b border-line-soft px-4 py-2 text-left last:border-b-0',
        selected ? 'bg-accent-weak shadow-rail' : 'bg-surface hover:bg-surface-2',
      )}
    >
      <span className="flex items-center justify-center">{icon}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-body font-medium text-ink max-md:line-clamp-2 md:truncate">{title}</span>
          {badge}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 truncate text-caption text-ink-2">
          {mobile && disciplines && <span className="flex shrink-0">{disciplines}</span>}
          {meta}
        </span>
      </span>
      <span className="flex min-w-0">{mobile ? null : disciplines}</span>
      <span className="text-right font-mono text-mono-sm text-ink-2">{date}</span>
    </button>
  )
}

/** Bordered list container with an optional footer line ("Ver no histórico →"). */
export function RowList({ children, footer, className }: { children: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-line bg-surface', className)}>
      {children}
      {footer && <div className="flex flex-wrap items-center gap-2 border-t border-line-soft bg-surface-2 px-4 py-2.5 text-small text-ink-2">{footer}</div>}
    </div>
  )
}

/** Visão geral body: list (flex 2, min 480) beside the side box (flex 1, min 280); wraps on narrow screens. */
export function OverviewColumns({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-8">
      <div className="flex min-w-0 flex-[2_1_480px] flex-col gap-3">{main}</div>
      <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-3">{side}</div>
    </div>
  )
}

/** Compact one-line row: 16 px marker, title, mono date ("Marcos da etapa atual"). */
export function CompactRow({ marker, title, date, onClick, itemId }: { marker: ReactNode; title: ReactNode; date?: ReactNode; onClick: () => void; itemId?: string }) {
  return (
    <button
      type="button"
      data-item-id={itemId}
      onClick={onClick}
      className="grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-2 rounded-sm py-1.5 text-left hover:bg-surface-2 max-md:min-h-touch"
    >
      <span className="flex items-center justify-center">{marker}</span>
      <span className="truncate text-small text-ink">{title}</span>
      {date != null && <span className="font-mono text-mono-sm text-ink-2">{date}</span>}
    </button>
  )
}

export interface KpiTileProps {
  /** Says exactly what is counted ("Decisões com consenso total") */
  label: ReactNode
  /** Always ink */
  value: ReactNode
  note?: ReactNode
  /** Colour only in the note: danger-ink ("1 atrasada"), warning-ink ("2 com ressalvas") */
  tone?: 'neutral' | 'danger' | 'warning'
}

const KPI_NOTE = { neutral: 'text-ink-2', danger: 'font-semibold text-danger-ink', warning: 'font-semibold text-warning-ink' } as const

/** KPI tile (COMPONENTS.md → KpiTile): the OverviewTile anatomy without selection. */
export function KpiTile({ label, value, note, tone = 'neutral' }: KpiTileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-surface px-[18px] py-3.5">
      <dt className="order-2 text-small font-semibold text-ink">{label}</dt>
      <dd className="order-1 text-kpi text-ink">{value}</dd>
      {note && <dd className={cn('order-3 text-caption', KPI_NOTE[tone])}>{note}</dd>}
    </div>
  )
}

/** A row of KpiTiles: 4 across on desktop, 2 on phones. */
export function KpiTiles({ children, label }: { children: ReactNode; label: string }) {
  return (
    <dl aria-label={label} className="grid grid-cols-2 gap-2 md:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] md:gap-3">
      {children}
    </dl>
  )
}

export interface DisciplineBar {
  discipline: string
  label: ReactNode
  count: number
}

/**
 * Count per discipline (README §5.12): name with its square, a bar in the discipline colour
 * proportional to the largest count, and the count in mono. The label always names the
 * discipline, so colour is never the only signal.
 */
export function DisciplineBarList({ rows, className }: { rows: DisciplineBar[]; className?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <ul className={cn('flex flex-col gap-2.5', className)}>
      {rows.map((row) => (
        <li key={row.discipline} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2.5rem] items-center gap-3 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_3rem]">
          <span className="flex min-w-0 items-center gap-2">
            <span aria-hidden className={cn('h-2.5 w-2.5 shrink-0 rounded-xs', disciplineMeta(row.discipline).markerClass)} />
            <span className="truncate text-small text-ink">{row.label}</span>
          </span>
          <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-surface-3">
            <span
              className={cn('block h-full rounded-full print:[print-color-adjust:exact]', disciplineMeta(row.discipline).markerClass)}
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </span>
          <span className="text-right font-mono text-mono text-ink-2">{row.count}</span>
        </li>
      ))}
    </ul>
  )
}

export interface NotificationRowProps {
  icon: ReactNode
  title: ReactNode
  meta: ReactNode
  /** "hoje", "ontem", "03/03" */
  time: ReactNode
  unread: boolean
  /** Screen-reader word for the unread dot ("Não lida") */
  unreadLabel: string
  onClick: () => void
}

/**
 * Notification (UX-UI-GUIDELINES §5 → Notifications): an OverviewRow-style two-line row;
 * unread rows sit on `accent-weak` with a dot (and its label, so colour isn't the only signal).
 */
export function NotificationRow({ icon, title, meta, time, unread, unreadLabel, onClick }: NotificationRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'grid min-h-row-2 w-full grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line-soft px-4 py-2 text-left last:border-b-0 max-md:min-h-14',
        unread ? 'bg-accent-weak hover:bg-accent-weak' : 'bg-surface hover:bg-surface-2',
      )}
    >
      <span className="flex items-center justify-center">{icon}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn('truncate text-body text-ink', unread ? 'font-semibold' : 'font-medium')}>{title}</span>
        <span className="flex min-w-0 items-center gap-1.5 truncate text-caption text-ink-2">{meta}</span>
      </span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-mono-sm text-ink-2">{time}</span>
        {unread && (
          <span role="img" aria-label={unreadLabel} className="h-2 w-2 rounded-full bg-accent" />
        )}
      </span>
    </button>
  )
}
