import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface FilterPopoverProps {
  label: string
  activeCount: number
  children: React.ReactNode
  width?: string
}

export function FilterPopover({
  label,
  activeCount,
  children,
  width = 'w-48',
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        aria-label={`Filter by ${label}`}
        aria-expanded={open}
      >
        <span>
          {label}
          {activeCount > 0 && (
            <span className="ml-1 text-blue-600">({activeCount})</span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className={`absolute top-full left-0 mt-1 ${width} bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3`}
        >
          {children}
        </div>
      )}
    </div>
  )
}
