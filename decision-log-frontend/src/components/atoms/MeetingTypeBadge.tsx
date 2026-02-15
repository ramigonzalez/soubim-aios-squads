interface MeetingTypeBadgeProps {
  type?: string | null
}

const MEETING_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  'client meeting': { bg: 'bg-rose-50', text: 'text-rose-700' },
  'coordination': { bg: 'bg-teal-50', text: 'text-teal-700' },
  'design review': { bg: 'bg-amber-50', text: 'text-amber-700' },
  'internal review': { bg: 'bg-blue-50', text: 'text-blue-700' },
  'internal': { bg: 'bg-blue-50', text: 'text-blue-700' },
}

const DEFAULT_COLORS = { bg: 'bg-gray-50', text: 'text-gray-600' }

export function MeetingTypeBadge({ type }: MeetingTypeBadgeProps) {
  if (!type) return null

  const colors = MEETING_TYPE_COLORS[type.toLowerCase()] || DEFAULT_COLORS

  return (
    <span
      className={`${colors.bg} ${colors.text} text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap`}
    >
      {type}
    </span>
  )
}
