import { ExternalLink } from 'lucide-react'
import IngestionStatusBadge from './IngestionStatusBadge'
import AISummaryExpander from './AISummaryExpander'
import { formatDateTime } from '../../lib/utils'
import type { MeetingSource } from '../../types/ingestion'

interface MeetingSourceRowProps {
  source: MeetingSource
  selected: boolean
  onToggleSelect: (id: string) => void
  onToggleInclude: (id: string, included: boolean) => void
}

export default function MeetingSourceRow({
  source,
  selected,
  onToggleSelect,
  onToggleInclude,
}: MeetingSourceRowProps) {
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
      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-mono">
        {source.call_id}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
        {source.project_name}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
        {formatDateTime(source.meeting_date)}
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
        <button
          role="switch"
          aria-checked={source.included}
          aria-label={`Include ${source.id}`}
          onClick={() => onToggleInclude(source.id, !source.included)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            source.included ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              source.included ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
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
    </tr>
  )
}
