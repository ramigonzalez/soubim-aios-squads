interface MeetingSummaryProps {
  summary: string
  isExpanded: boolean
}

/**
 * Expandable AI-generated meeting summary.
 * Story 9.4 — renders below source group header, above item rows.
 */
export function MeetingSummary({ summary, isExpanded }: MeetingSummaryProps) {
  if (!isExpanded) return null
  return (
    <div className="bg-blue-50/50 px-4 py-3 border-b border-blue-100 transition-all duration-200">
      <p className="text-sm text-gray-700 italic">{summary}</p>
    </div>
  )
}
