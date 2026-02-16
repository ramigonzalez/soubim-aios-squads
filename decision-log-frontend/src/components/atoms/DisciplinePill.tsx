import { getDisciplinePillColors, abbreviateDiscipline } from '../../lib/utils'

interface DisciplinePillProps {
  discipline: string
  className?: string
}

export function DisciplinePill({ discipline, className = '' }: DisciplinePillProps) {
  const colors = getDisciplinePillColors(discipline)

  return (
    <span
      className={`${colors.bg} ${colors.text} text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${className}`}
    >
      {abbreviateDiscipline(discipline)}
    </span>
  )
}
