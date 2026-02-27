import { useState } from 'react'

interface AISummaryExpanderProps {
  summary: string | null
}

export default function AISummaryExpander({ summary }: AISummaryExpanderProps) {
  const [expanded, setExpanded] = useState(false)

  if (!summary) {
    return <span className="text-sm text-gray-400 italic">No summary available</span>
  }

  const isLong = summary.length > 80
  const displayText = expanded || !isLong ? summary : summary.slice(0, 80) + '...'

  return (
    <div className="text-sm text-gray-700 max-w-xs">
      <span>{displayText}</span>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setExpanded(!expanded)
          }}
          className="ml-1 text-blue-600 hover:text-blue-800 text-xs font-medium cursor-pointer"
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
