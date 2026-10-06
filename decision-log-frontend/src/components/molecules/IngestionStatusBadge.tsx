import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'
import type { IngestionStatus, SourceJob } from '../../types/ingestion'

const STATUS_STYLES: Record<IngestionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  processed: 'bg-blue-100 text-blue-800',
  failed: 'bg-orange-100 text-orange-800',
}

/** While an approved source is with the worker (Story 13.2): queued, processing or waiting to retry */
type ProcessingState = 'queued' | 'running' | 'retrying'

const PROCESSING_STYLES: Record<ProcessingState, string> = {
  queued: 'bg-slate-100 text-slate-700',
  running: 'bg-indigo-100 text-indigo-800',
  retrying: 'bg-amber-100 text-amber-800',
}

function processingState(status: IngestionStatus, job?: SourceJob | null): ProcessingState | null {
  if (status !== 'approved' || !job) return null
  if (job.status === 'running') return 'running'
  if (job.status === 'queued') return job.attempts > 0 ? 'retrying' : 'queued'
  return null
}

interface IngestionStatusBadgeProps {
  status: IngestionStatus
  job?: SourceJob | null
}

export default function IngestionStatusBadge({ status, job }: IngestionStatusBadgeProps) {
  const { t } = useTranslation('ingestion')
  const processing = processingState(status, job)
  const label = processing
    ? t(`processing.${processing}`, { attempt: (job?.attempts ?? 0) + 1, max: job?.max_attempts ?? 0 })
    : t(`status.${status}`)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
        !processing && 'capitalize',
        processing ? PROCESSING_STYLES[processing] : STATUS_STYLES[status]
      )}
      aria-label={t('status.ariaLabel', { status: label })}
      title={processing === 'retrying' && job?.last_error ? job.last_error : undefined}
    >
      {processing === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden="true" />
      )}
      {label}
    </span>
  )
}
