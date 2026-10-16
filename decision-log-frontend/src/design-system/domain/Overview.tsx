import type { ReactNode } from 'react'
import { cn } from '../cn'
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
