import { forwardRef, type ReactNode } from 'react'
import { cn } from '../cn'
import { Icons } from '../icons'

export interface ItemRowProps {
  itemId: string
  /** ItemTypeIcon (a button for actions: toggles done) */
  icon: ReactNode
  title: ReactNode
  /** Done action: title in ink-3 with line-through */
  done?: boolean
  /** Due / review badges after the title */
  badges?: ReactNode
  disciplines?: ReactNode
  /** Avatar + first name */
  owner?: ReactNode
  /** Source icon (14, ink-3) */
  source?: ReactNode
  /** dd/MM, mono */
  date?: ReactNode
  /** MilestoneStar */
  star?: ReactNode
  selected?: boolean
  compact?: boolean
  onOpen: () => void
}

/**
 * Dense history row (COMPONENTS.md → ItemRow):
 * grid 24 · title (min 220) · disciplines 104 · owner 112 · source 18 · date 46 · star 18.
 * The row is focusable; Enter or a click opens the panel. Secondary columns clip first.
 */
export const ItemRow = forwardRef<HTMLDivElement, ItemRowProps>(function ItemRow(
  { itemId, icon, title, done, badges, disciplines, owner, source, date, star, selected, compact, onOpen },
  ref,
) {
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      data-item-id={itemId}
      aria-current={selected || undefined}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className={cn(
        'group grid cursor-pointer items-center gap-2.5 border-b border-line-soft px-2 outline-none last:border-b-0',
        'grid-cols-[24px_minmax(0,1fr)_18px_46px_18px] md:grid-cols-[24px_minmax(220px,1fr)_minmax(0,104px)_minmax(0,112px)_18px_46px_18px]',
        compact ? 'h-row-compact' : 'h-row',
        'focus-visible:shadow-[inset_0_0_0_2px_var(--accent)]',
        selected ? 'bg-accent-weak shadow-rail' : 'bg-surface hover:bg-surface-2',
      )}
    >
      <span className="flex items-center justify-center">{icon}</span>
      <span className="flex min-w-[90px] items-center gap-2 overflow-hidden">
        <span className={cn('min-w-0 truncate text-body font-medium', done ? 'text-ink-3 line-through' : 'text-ink')}>{title}</span>
        {badges}
      </span>
      <span className="hidden min-w-0 overflow-hidden md:flex">{disciplines}</span>
      <span className="hidden min-w-0 items-center gap-1.5 overflow-hidden text-caption text-ink-2 md:flex">{owner}</span>
      <span className="flex items-center justify-center">{source}</span>
      <span className="text-right font-mono text-mono-sm text-ink-2">{date}</span>
      <span className="flex items-center justify-center">{star}</span>
    </div>
  )
})

/** Date group header: h3 "6 de fevereiro" + weekday + count on the right. */
export function DateGroupHeader({ title, weekday, count }: { title: ReactNode; weekday?: ReactNode; count: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 px-1 pb-2 pt-1">
      <h3 className="text-h3 text-ink">{title}</h3>
      {weekday && <span className="text-caption text-ink-2">{weekday}</span>}
      <span className="ml-auto font-mono text-mono-sm text-ink-2">{count}</span>
    </div>
  )
}

/** Discipline group header: 10 px square + name + count. */
export function DisciplineGroupHeader({ marker, title, count }: { marker: ReactNode; title: ReactNode; count: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-1 pb-2 pt-1">
      {marker}
      <h3 className="text-h3 text-ink">{title}</h3>
      <span className="ml-auto font-mono text-mono-sm text-ink-2">{count}</span>
    </div>
  )
}

export interface SourceBandProps {
  tile: ReactNode
  /** "Reunião" */
  kind: ReactNode
  title: ReactNode
  /** "45 min · Gabriela, Carlos, Lucia" */
  meta?: ReactNode
  /** One-line AI summary */
  summary?: ReactNode
  /** Badges and actions on the right ("Abrir transcrição", "Aprovar 3 pendentes") */
  actions?: ReactNode
  expanded: boolean
  onToggle: () => void
  /** Accessible label of the toggle */
  toggleLabel: string
  children: ReactNode
}

/** Collapsible source band inside a date group (COMPONENTS.md → GroupHeader, source group). */
export function SourceBand({ tile, kind, title, meta, summary, actions, expanded, onToggle, toggleLabel, children }: SourceBandProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex items-start gap-3 border-b border-line-soft bg-surface-2 px-3 py-2.5">
        {tile}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="flex min-w-0 items-baseline gap-1.5">
            <span className="shrink-0 text-caption text-ink-2">{kind}</span>
            <span className="truncate text-body font-semibold text-ink">{title}</span>
          </p>
          {meta && <p className="truncate text-caption text-ink-2">{meta}</p>}
          {summary && <p className="truncate text-caption text-ink-soft">{summary}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={toggleLabel}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-2 hover:bg-surface-3 hover:text-ink"
        >
          <Icons.dropdown className={cn('h-4 w-4 transition-transform duration-fast', expanded && 'rotate-180')} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      {expanded && <div>{children}</div>}
    </section>
  )
}
