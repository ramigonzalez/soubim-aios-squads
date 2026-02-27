import { DisciplineCircle } from './DisciplineCircle'
import type { Discipline } from '../../types/projectItem'

interface DisciplineCirclesProps {
  disciplines: Discipline[]
  max?: number
}

export function DisciplineCircles({ disciplines, max = 3 }: DisciplineCirclesProps) {
  const visible = disciplines.slice(0, max)
  const overflow = disciplines.length - max

  return (
    <span className="inline-flex items-center">
      {visible.map((d, i) => (
        <DisciplineCircle
          key={d}
          discipline={d}
          isPrimary={i === 0}
          className={i > 0 ? '-ml-1' : ''}
        />
      ))}
      {overflow > 0 && (
        <span className="text-xs text-gray-500 ml-1">+{overflow}</span>
      )}
    </span>
  )
}
