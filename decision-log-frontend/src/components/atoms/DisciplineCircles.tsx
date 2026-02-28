import React from 'react'
import { DisciplineCircle } from './DisciplineCircle'
import { getDisciplineLabel } from '../../lib/utils'
import type { Discipline } from '../../types/projectItem'

interface DisciplineCirclesProps {
  disciplines: (Discipline | string)[]
  max?: number
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Stacked discipline circles with overflow tooltip.
 * Story 9.1: Base component. Story 9.3: Added overflow tooltip, size prop, React.memo.
 */
export const DisciplineCircles = React.memo(function DisciplineCircles({
  disciplines,
  max = 3,
  size = 'md',
}: DisciplineCirclesProps) {
  if (!disciplines || disciplines.length === 0) return null

  const visible = disciplines.slice(0, max)
  const overflow = disciplines.length - max
  const overflowDisciplines = overflow > 0 ? disciplines.slice(max) : []

  return (
    <span className="inline-flex items-center">
      {visible.map((d, i) => (
        <DisciplineCircle
          key={d}
          discipline={d}
          isPrimary={i === 0}
          size={size}
          className={i > 0 ? '-ml-1' : ''}
        />
      ))}
      {overflow > 0 && (
        <span className="relative group/overflow ml-1">
          <span
            className="text-xs text-gray-500 cursor-default"
            aria-label={`${overflow} more disciplines: ${overflowDisciplines.map(getDisciplineLabel).join(', ')}`}
          >
            +{overflow}
          </span>
          {/* CSS tooltip */}
          <span
            role="tooltip"
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/overflow:block z-50"
          >
            <span className="bg-gray-900 text-white text-xs rounded-lg shadow-lg py-1.5 px-2.5 whitespace-nowrap block">
              {overflowDisciplines.map(getDisciplineLabel).join(', ')}
            </span>
            <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
          </span>
        </span>
      )}
    </span>
  )
})
