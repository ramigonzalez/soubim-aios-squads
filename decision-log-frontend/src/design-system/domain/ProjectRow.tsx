import type { ReactNode } from 'react'
import { cn } from '../cn'

/** Projects table header (label caps): Projeto | Etapa atual | Novidades e pendências. */
export function ProjectTableHeader({ columns }: { columns: [ReactNode, ReactNode, ReactNode] }) {
  return (
    <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.3fr)_36px] gap-4 border-b border-line bg-surface-2 px-4 py-2.5 text-label uppercase text-ink-2 md:grid">
      <span>{columns[0]}</span>
      <span>{columns[1]}</span>
      <span>{columns[2]}</span>
      <span />
    </div>
  )
}

export interface ProjectRowProps {
  name: ReactNode
  /** description · team size */
  meta: ReactNode
  /** MiniStageBar */
  stageBar?: ReactNode
  stageName: ReactNode
  stageNote?: ReactNode
  news: ReactNode
  activity?: ReactNode
  badges?: ReactNode
  /** "⋯" menu */
  menu?: ReactNode
  onOpen: () => void
  muted?: boolean
}

/**
 * Project row (COMPONENTS.md → ProjectRow): one row per project, scales to 20+.
 * Grid 1.5fr · 1fr · 1.3fr; stacks into a card below 768.
 */
export function ProjectRow({ name, meta, stageBar, stageName, stageNote, news, activity, badges, menu, onOpen, muted }: ProjectRowProps) {
  return (
    <div className={cn('relative border-b border-line-soft last:border-b-0 hover:bg-surface-2', muted && 'opacity-75')}>
      <button
        type="button"
        onClick={onOpen}
        className="grid w-full grid-cols-1 gap-3 px-4 py-3.5 pr-14 text-left md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.3fr)_36px] md:gap-4 md:pr-4"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-h3 text-ink">{name}</span>
          <span className="flex min-w-0 items-center gap-1 truncate text-caption text-ink-2">{meta}</span>
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          {stageBar}
          <span className="truncate text-small font-semibold text-ink">{stageName}</span>
          {stageNote && <span className="truncate text-caption text-ink-2">{stageNote}</span>}
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-small font-semibold text-ink">{news}</span>
          {activity && <span className="truncate text-caption text-ink-2">{activity}</span>}
          {badges && <span className="flex flex-wrap gap-1.5">{badges}</span>}
        </span>
      </button>
      {menu && <span className="absolute right-3 top-3">{menu}</span>}
    </div>
  )
}
