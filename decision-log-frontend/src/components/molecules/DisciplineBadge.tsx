import { getDisciplineColor } from '../../lib/utils'

interface DisciplineBadgeProps {
  discipline: string
}

export function DisciplineBadge({ discipline }: DisciplineBadgeProps) {
  const { bg, text, border } = getDisciplineColor(discipline)

  return (
    <div className={`${bg} ${text} ${border} border px-3 py-1 rounded-full text-sm font-medium`}>
      {discipline.charAt(0).toUpperCase() + discipline.slice(1)}
    </div>
  )
}
