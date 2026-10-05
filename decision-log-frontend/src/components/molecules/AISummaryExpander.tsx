import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface AISummaryExpanderProps {
  summary: string | null
}

export default function AISummaryExpander({ summary }: AISummaryExpanderProps) {
  const [expanded, setExpanded] = useState(false)
  const { t } = useTranslation('history')

  if (!summary) {
    return <span className="text-sm text-gray-400 italic">{t('aiSummary.empty')}</span>
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
          {expanded ? t('aiSummary.showLess') : t('aiSummary.showMore')}
        </button>
      )}
    </div>
  )
}
