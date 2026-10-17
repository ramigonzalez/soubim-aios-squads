import { useTranslation } from 'react-i18next'
import type { SourceType } from '../../types/projectItem'
import { cn } from '../cn'
import { SOURCE_ICONS, sourceLabelKey } from '../itemTypes'

export interface SourceIconProps {
  type: SourceType
  /** 14 in rows · 16 elsewhere */
  size?: 14 | 16
  className?: string
}

/** Source icon, ink-3 by default, with the source name as its accessible label. */
export function SourceIcon({ type, size = 14, className }: SourceIconProps) {
  const { t } = useTranslation()
  const Icon = SOURCE_ICONS[type]
  return (
    <Icon
      role="img"
      aria-label={t(sourceLabelKey(type))}
      className={cn(size === 14 ? 'h-3.5 w-3.5' : 'h-4 w-4', 'shrink-0 text-ink-3', className)}
      strokeWidth={1.75}
    />
  )
}

const TILE: Record<SourceType, string> = {
  meeting: 'bg-ink text-on-dark',
  email: 'border border-line-strong bg-surface text-ink',
  document: 'bg-surface-sunk text-ink',
  manual_input: 'bg-surface-3 text-ink',
}

/** 32 × 32 source tile (radius lg) for source bands, ingestion rows and meetings. */
export function SourceTile({ type, className }: { type: SourceType; className?: string }) {
  const { t } = useTranslation()
  const Icon = SOURCE_ICONS[type]
  return (
    <span
      role="img"
      aria-label={t(sourceLabelKey(type))}
      className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TILE[type], className)}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
    </span>
  )
}
