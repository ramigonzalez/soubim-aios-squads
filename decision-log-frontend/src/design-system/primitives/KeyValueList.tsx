import type { ReactNode } from 'react'
import { cn } from '../cn'

export interface KeyValueItem {
  label: ReactNode
  value: ReactNode
}

export interface KeyValueListProps {
  items: KeyValueItem[]
  /** panel: 76 px labels · wide: 96 px (ingestion) */
  variant?: 'panel' | 'wide'
  /** surface-2 box for secondary details */
  boxed?: boolean
  className?: string
}

/** Label/value grid (COMPONENTS.md §2). Items with an empty value are not rendered. */
export function KeyValueList({ items, variant = 'panel', boxed = false, className }: KeyValueListProps) {
  const visible = items.filter((item) => item.value != null && item.value !== '' && item.value !== false)
  if (visible.length === 0) return null
  return (
    <dl
      className={cn(
        'grid gap-x-2.5 gap-y-2 text-small',
        variant === 'panel' ? 'grid-cols-[76px_minmax(0,1fr)]' : 'grid-cols-[96px_minmax(0,1fr)] gap-x-3',
        boxed && 'rounded-md bg-surface-2 px-3 py-2.5',
        className,
      )}
    >
      {visible.map((item, i) => (
        <div key={i} className="contents">
          <dt className="text-ink-2">{item.label}</dt>
          <dd className="min-w-0 text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
