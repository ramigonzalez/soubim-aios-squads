import { cn, getDisciplineCircleColor, getDisciplineInitial } from '../../lib/utils'
import type { Discipline } from '../../types/projectItem'

interface DisciplineCircleProps {
  discipline: Discipline
  isPrimary?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function DisciplineCircle({ discipline, isPrimary = false, size = 'md', className }: DisciplineCircleProps) {
  const bgColor = getDisciplineCircleColor(discipline)
  const initial = getDisciplineInitial(discipline)

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full text-white font-bold',
        size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs',
        isPrimary && 'ring-2 ring-white ring-offset-1',
        className,
      )}
      style={{ backgroundColor: bgColor }}
      title={discipline}
      aria-label={discipline}
    >
      {initial}
    </span>
  )
}
