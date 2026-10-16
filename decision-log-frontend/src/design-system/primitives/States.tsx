import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../cn'
import { Icons } from '../icons'
import { Button } from './Button'

const SKELETON_WIDTHS = ['78%', '62%', '85%', '54%', '70%']

export interface SkeletonRowsProps {
  rows?: number
  /** Row height class matching the final layout */
  rowClassName?: string
  className?: string
}

/** Skeleton rows that match the final layout. Pulse is off under reduced motion. */
export function SkeletonRows({ rows = 5, rowClassName = 'h-row', className }: SkeletonRowsProps) {
  const { t } = useTranslation('ui')
  return (
    <div role="status" aria-label={t('loading')} className={cn('flex flex-col', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={cn('flex items-center border-b border-line-soft px-2 last:border-b-0', rowClassName)}>
          <Skeleton width={SKELETON_WIDTHS[i % SKELETON_WIDTHS.length]} />
        </div>
      ))}
    </div>
  )
}

export function Skeleton({ width = '100%', className }: { width?: string; className?: string }) {
  return <span aria-hidden className={cn('block h-3 rounded-xs bg-surface-sunk motion-safe:animate-pulse', className)} style={{ width }} />
}

interface StateProps {
  title: ReactNode
  text?: ReactNode
  action?: ReactNode
  className?: string
}

/** Say what will appear and how it gets there; offer one action. Don't apologise. */
export function EmptyState({ icon, title, text, action, className }: StateProps & { icon?: ReactNode }) {
  return (
    <div className={cn('flex flex-col items-center gap-2 px-6 py-12 text-center', className)}>
      {icon && <span className="mb-1 text-ink-3 [&_svg]:h-8 [&_svg]:w-8" aria-hidden>{icon}</span>}
      <h3 className="text-h3 text-ink">{title}</h3>
      {text && <p className="max-w-[360px] text-small text-ink-2">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** Say what failed, reassure when true, offer "Tentar de novo". */
export function ErrorState({ title, text, onRetry, action, className }: StateProps & { onRetry?: () => void }) {
  const { t } = useTranslation('ui')
  const Warn = Icons.warning
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-2 px-6 py-12 text-center', className)}>
      <Warn className="mb-1 h-8 w-8 text-danger" strokeWidth={1.25} aria-hidden />
      <h3 className="text-h3 text-ink">{title}</h3>
      {text && <p className="max-w-[360px] text-small text-ink-2">{text}</p>}
      {(onRetry || action) && (
        <div className="mt-2">
          {action ?? (
            <Button variant="secondary" onClick={onRetry}>
              {t('state.retry')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export interface BannerProps {
  tone?: 'info' | 'warning' | 'danger'
  children: ReactNode
  action?: ReactNode
  className?: string
}

/**
 * Inline notice: icon + text, never colour alone. Also used for ingestion
 * flags (info / warn). New pattern, flagged for design review.
 */
export function Banner({ tone = 'info', children, action, className }: BannerProps) {
  const Icon = tone === 'info' ? Icons.information : Icons.warning
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={cn(
        'flex items-start gap-2.5 rounded-md px-3 py-2.5 text-caption',
        tone === 'info' && 'bg-surface-3 text-ink-soft',
        tone === 'warning' && 'bg-warning-weak text-warning-ink',
        tone === 'danger' && 'bg-danger-weak text-danger-ink',
        className,
      )}
    >
      <Icon className="mt-px h-[15px] w-[15px] shrink-0" strokeWidth={1.75} aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
