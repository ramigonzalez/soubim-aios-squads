import { forwardRef, type ReactNode } from 'react'
import { cn } from '../cn'

export interface IngestionRowProps {
  rowId: string
  /** Checkbox (selection is independent from focus) */
  check: ReactNode
  tile: ReactNode
  title: ReactNode
  /** "Reunião · 02/03 às 14:00 · → Commercial Plaza Beta" */
  meta: ReactNode
  date?: ReactNode
  focused?: boolean
  onFocusRow: () => void
}

/** Ingestão list row (COMPONENTS.md → IngestionRow): grid 16 · 32 · 1fr · auto; focused = accent-weak + rail. */
export const IngestionRow = forwardRef<HTMLDivElement, IngestionRowProps>(function IngestionRow(
  { rowId, check, tile, title, meta, date, focused, onFocusRow },
  ref,
) {
  return (
    <div
      ref={ref}
      role="option"
      tabIndex={focused ? 0 : -1}
      aria-selected={focused}
      data-row-id={rowId}
      onClick={onFocusRow}
      onFocus={onFocusRow}
      className={cn(
        'grid cursor-pointer grid-cols-[24px_32px_minmax(0,1fr)_auto] items-start gap-3 border-b border-line-soft px-3.5 py-3 outline-none last:border-b-0',
        'focus-visible:shadow-[inset_0_0_0_2px_var(--accent)]',
        focused ? 'bg-accent-weak shadow-rail' : 'bg-surface hover:bg-surface-2',
      )}
    >
      <span className="flex justify-center pt-1" onClick={(e) => e.stopPropagation()}>
        {check}
      </span>
      {tile}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="line-clamp-2 text-body font-semibold text-ink">{title}</span>
        <span className="truncate text-caption text-ink-2">{meta}</span>
      </span>
      <span className="whitespace-nowrap pt-0.5 font-mono text-mono-sm text-ink-2">{date}</span>
    </div>
  )
})

/** Ingestão body: list (flex 1 1 300, max 420) beside the sticky decision panel; stacks when narrow. */
export function InboxColumns({ list, panel }: { list: ReactNode; panel: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 lg:max-w-[420px] lg:flex-[1_1_300px]">{list}</div>
      <div className="min-w-0 lg:sticky lg:top-6 lg:flex-[2_1_460px]">{panel}</div>
    </div>
  )
}

/** Labelled block inside the decision panel ("RESUMO DA IA · DO QUE TRATA"). */
export function PanelSection({ label, aside, children }: { label: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-label uppercase text-ink-2">{label}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}
