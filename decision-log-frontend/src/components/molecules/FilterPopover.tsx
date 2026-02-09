import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

interface FilterPopoverProps {
  label: string
  icon?: React.ReactNode
  activeCount: number
  children: React.ReactNode
  width?: string
}

export function FilterPopover({
  label,
  icon,
  activeCount,
  children,
  width = 'w-56',
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [open])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
    return undefined
  }, [open])

  const isActive = activeCount > 0

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-colors',
          isActive
            ? 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
            : 'border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
        )}
        aria-label={`Filter by ${label}`}
        aria-expanded={open}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{label}</span>
        {isActive && (
          <span className="ml-0.5 min-w-[18px] h-[18px] bg-blue-600 text-white text-[10px] font-medium rounded-full inline-flex items-center justify-center">
            {activeCount}
          </span>
        )}
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isActive ? 'text-blue-500' : 'text-gray-400', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className={`absolute top-full left-0 mt-1.5 ${width} bg-white border border-gray-200 rounded-xl shadow-md z-50 p-3`}
        >
          {children}
        </div>
      )}
    </div>
  )
}
