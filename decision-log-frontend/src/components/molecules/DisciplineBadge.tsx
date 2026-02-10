import { getDisciplinePillColors } from '../../lib/utils'

interface DisciplineBadgeProps {
  discipline: string
}

export function DisciplineBadge({ discipline }: DisciplineBadgeProps) {
  const { bg, text } = getDisciplinePillColors(discipline)

  return (
    <div className={`${bg} ${text} px-3 py-1 rounded-full text-sm font-medium`}>
      {discipline.charAt(0).toUpperCase() + discipline.slice(1)}
    </div>
  )
}
