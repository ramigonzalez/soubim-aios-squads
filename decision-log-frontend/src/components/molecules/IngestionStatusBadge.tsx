import { cn } from '../../lib/utils'
import type { IngestionStatus } from '../../types/ingestion'

const STATUS_STYLES: Record<IngestionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  processed: 'bg-blue-100 text-blue-800',
}

interface IngestionStatusBadgeProps {
  status: IngestionStatus
}

export default function IngestionStatusBadge({ status }: IngestionStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full capitalize',
        STATUS_STYLES[status]
      )}
      aria-label={`Status: ${status}`}
    >
      {status}
    </span>
  )
}
