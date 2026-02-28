import { Video, Mail, FileText, PenLine, CheckCircle2, MessageCircle, Target, Lightbulb, Info } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { SourceType, ItemType } from '../../types/projectItem'
import type { LucideIcon } from 'lucide-react'

interface MilestoneFilterBarProps {
  sourceFilters: SourceType[]
  itemTypeFilters: ItemType[]
  onToggleSource: (source: SourceType) => void
  onToggleItemType: (type: ItemType) => void
  onClearAll: () => void
}

interface ChipConfig<T> {
  value: T
  label: string
  icon: LucideIcon
  activeClass: string
}

const SOURCE_CHIPS: ChipConfig<SourceType>[] = [
  { value: 'meeting', label: 'Meeting', icon: Video, activeClass: 'bg-indigo-100 text-indigo-700' },
  { value: 'email', label: 'Email', icon: Mail, activeClass: 'bg-sky-100 text-sky-700' },
  { value: 'document', label: 'Document', icon: FileText, activeClass: 'bg-orange-100 text-orange-700' },
  { value: 'manual_input', label: 'Manual', icon: PenLine, activeClass: 'bg-gray-200 text-gray-700' },
]

const ITEM_TYPE_CHIPS: ChipConfig<ItemType>[] = [
  { value: 'decision', label: 'Decision', icon: CheckCircle2, activeClass: 'bg-green-100 text-green-700' },
  { value: 'topic', label: 'Topic', icon: MessageCircle, activeClass: 'bg-amber-100 text-amber-700' },
  { value: 'action_item', label: 'Action Item', icon: Target, activeClass: 'bg-blue-100 text-blue-700' },
  { value: 'idea', label: 'Idea', icon: Lightbulb, activeClass: 'bg-purple-100 text-purple-700' },
  { value: 'information', label: 'Info', icon: Info, activeClass: 'bg-slate-100 text-slate-700' },
]

/**
 * MilestoneFilterBar — chip-toggle filter bar for the Milestone Timeline.
 * Two filter dimensions: Source Type and Item Type.
 * Story 8.3: Frontend — Milestone Timeline Filters
 */
export function MilestoneFilterBar({
  sourceFilters,
  itemTypeFilters,
  onToggleSource,
  onToggleItemType,
  onClearAll,
}: MilestoneFilterBarProps) {
  const activeCount = sourceFilters.length + itemTypeFilters.length

  return (
    <div className="flex flex-col gap-2 mb-4 p-3 bg-white border border-gray-200 rounded-lg" data-testid="milestone-filter-bar">
      {/* Source filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 w-12 shrink-0">Source:</span>
        {SOURCE_CHIPS.map((chip) => {
          const Icon = chip.icon
          const isActive = sourceFilters.includes(chip.value)
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => onToggleSource(chip.value)}
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer transition-colors',
                isActive ? chip.activeClass : 'bg-gray-100 text-gray-600'
              )}
              aria-pressed={isActive}
              data-testid={`source-chip-${chip.value}`}
            >
              <Icon className="w-3 h-3" />
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* Item type filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 w-12 shrink-0">Type:</span>
        {ITEM_TYPE_CHIPS.map((chip) => {
          const Icon = chip.icon
          const isActive = itemTypeFilters.includes(chip.value)
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => onToggleItemType(chip.value)}
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer transition-colors',
                isActive ? chip.activeClass : 'bg-gray-100 text-gray-600'
              )}
              aria-pressed={isActive}
              data-testid={`type-chip-${chip.value}`}
            >
              <Icon className="w-3 h-3" />
              {chip.label}
            </button>
          )
        })}

        {/* Active count badge + Clear button */}
        {activeCount > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span
              className="text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5"
              data-testid="active-count-badge"
            >
              {activeCount}
            </span>
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-blue-600 hover:underline"
              data-testid="clear-filters-button"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
