import { ExternalLink, Check, X, RefreshCw, CheckCircle, MinusCircle } from 'lucide-react'
import IngestionStatusBadge from './IngestionStatusBadge'
import AISummaryExpander from './AISummaryExpander'
import { formatDate, formatFileSize } from '../../lib/utils'
import type { DocumentSource } from '../../types/ingestion'

interface DocumentSourceRowProps {
  source: DocumentSource
  selected: boolean
  onToggleSelect: (id: string) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onRetry?: (id: string) => void
  isActionLoading?: boolean
}

export default function DocumentSourceRow({
  source,
  selected,
  onToggleSelect,
  onApprove,
  onReject,
  onRetry,
  isActionLoading,
}: DocumentSourceRowProps) {
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
          aria-label={`Select ${source.document_id}`}
        />
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 truncate font-mono" title={source.document_id}>
        {source.document_id}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 truncate" title={source.project_name}>
        {source.project_name}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
        {formatDate(source.upload_date.split('T')[0])}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 truncate" title={source.file_name}>
        {source.file_name}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap uppercase">
        {source.file_type}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
        {formatFileSize(source.file_size_bytes)}
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
        {source.file_url ? (
          <a
            href={source.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
          >
            File <ExternalLink className="w-3 h-3" />
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
              aria-label={`Approve ${source.file_name}`}
              title="Approve"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => onReject?.(source.id)}
              disabled={isActionLoading}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors disabled:opacity-50"
              aria-label={`Reject ${source.file_name}`}
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
            aria-label={`Retry ${source.file_name}`}
            title="Retry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </td>
    </tr>
  )
}
