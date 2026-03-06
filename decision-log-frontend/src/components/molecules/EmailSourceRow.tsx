import { ExternalLink, Check, X, RefreshCw, CheckCircle, MinusCircle } from 'lucide-react'
import IngestionStatusBadge from './IngestionStatusBadge'
import AISummaryExpander from './AISummaryExpander'
import { formatDate } from '../../lib/utils'
import type { EmailSource } from '../../types/ingestion'

interface EmailSourceRowProps {
  source: EmailSource
  selected: boolean
  onToggleSelect: (id: string) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onRetry?: (id: string) => void
  isActionLoading?: boolean
}

export default function EmailSourceRow({
  source,
  selected,
  onToggleSelect,
  onApprove,
  onReject,
  onRetry,
  isActionLoading,
}: EmailSourceRowProps) {
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
          aria-label={`Select ${source.email_id}`}
        />
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 truncate font-mono" title={source.email_id}>
        {source.email_id}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 truncate" title={source.project_name}>
        {source.project_name}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
        {formatDate(source.email_date.split('T')[0])}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 truncate" title={source.subject}>
        {source.subject}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 truncate" title={source.from_address}>
        {source.from_address}
      </td>
      <td className="px-4 py-3 text-sm whitespace-nowrap">
        <span className="inline-flex items-center bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
          {source.recipient_count} recipients
        </span>
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
        {source.thread_url ? (
          <a
            href={source.thread_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
          >
            Thread <ExternalLink className="w-3 h-3" />
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
              aria-label={`Approve ${source.subject}`}
              title="Approve"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => onReject?.(source.id)}
              disabled={isActionLoading}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors disabled:opacity-50"
              aria-label={`Reject ${source.subject}`}
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
            aria-label={`Retry ${source.subject}`}
            title="Retry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </td>
    </tr>
  )
}
