import { useTranslation } from 'react-i18next'
import { cn, getDisciplineCircleColor, getDisciplineInitial, getDisciplineLabel } from '../../lib/utils'
import type { Discipline } from '../../types/projectItem'

interface DisciplineCircleProps {
  discipline: Discipline | string
  isPrimary?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-6 h-6 text-xs',
  lg: 'w-8 h-8 text-sm',
}

export function DisciplineCircle({ discipline, isPrimary = false, size = 'md', className }: DisciplineCircleProps) {
  const bgColor = getDisciplineCircleColor(discipline as Discipline)
  const initial = getDisciplineInitial(discipline as Discipline)
  const { t } = useTranslation('history')
  // English keeps the raw discipline id (existing behaviour); Portuguese shows the translated name
  const label = t('disciplineCircle.label', { id: discipline, label: getDisciplineLabel(discipline) })

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full text-white font-bold flex-shrink-0',
        SIZE_CLASSES[size],
        isPrimary && 'ring-2 ring-white ring-offset-1',
        className,
      )}
      style={{ backgroundColor: bgColor }}
      title={label}
      aria-label={label}
    >
      {initial}
    </span>
  )
}
