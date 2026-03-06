import { ExternalLink, Check, X, RefreshCw, CheckCircle, MinusCircle } from 'lucide-react'
import IngestionStatusBadge from './IngestionStatusBadge'
import AISummaryExpander from './AISummaryExpander'
import { formatDateTime } from '../../lib/utils'
import type { MeetingSource } from '../../types/ingestion'

interface MeetingSourceRowProps {
  source: MeetingSource
  selected: boolean
  onToggleSelect: (id: string) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onRetry?: (id: string) => void
  isActionLoading?: boolean
}

export default function MeetingSourceRow({
  source,
  selected,
  onToggleSelect,
  onApprove,
  onReject,
  onRetry,
  isActionLoading,
}: MeetingSourceRowProps) {
  const isPending = source.status === 'pending'
  const isFailed = source.status === 'failed'

  return (
    <tr className="hover:bg-gray-50 transition-colors duration-100">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(source.id)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          aria-label={`Select ${source.call_id}`}
        />
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 truncate font-mono" title={source.call_id}>
        {source.call_id}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 truncate" title={source.project_name}>
        {source.project_name}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
        {formatDateTime(source.meeting_date)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900">
        {source.title}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
        {source.meeting_type}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
        {source.source_label}
      </td>
      <td className="px-4 py-3">
        <IngestionStatusBadge status={source.status} />
      </td>
      <td className="px-4 py-3">
        {source.included ? (
          <CheckCircle className="w-4 h-4 text-green-500" aria-label="Included" />
        ) : (
          <MinusCircle className="w-4 h-4 text-gray-300" aria-label="Not included" />
        )}
      </td>
      <td className="px-4 py-3">
        <AISummaryExpander summary={source.ai_summary} />
      </td>
      <td className="px-4 py-3 text-sm whitespace-nowrap">
        {source.transcript_url ? (
          <a
            href={source.transcript_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
          >
            Transcript <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-gray-400">--</span>
        )}
      </td>
      <td className="px-4 py-3">
        {isPending && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onApprove?.(source.id)}
              disabled={isActionLoading}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-colors disabled:opacity-50"
              aria-label={`Approve ${source.title}`}
              title="Approve"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => onReject?.(source.id)}
              disabled={isActionLoading}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors disabled:opacity-50"
              aria-label={`Reject ${source.title}`}
              title="Reject"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {isFailed && (
          <button
            onClick={() => onRetry?.(source.id)}
            disabled={isActionLoading}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700 transition-colors disabled:opacity-50"
            aria-label={`Retry ${source.title}`}
            title="Retry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </td>
    </tr>
  )
}
