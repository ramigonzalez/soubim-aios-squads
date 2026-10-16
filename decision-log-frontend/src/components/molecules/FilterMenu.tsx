/**
 * Quiet multi-select menu ("Todos os tipos ▾"): checkbox items with an optional
 * marker and count. The trigger shows the selection count and turns
 * accent-weak while a filter is active (COMPONENTS.md → FilterBar).
 */
import type { ReactNode } from 'react'
import { cn, Icons, Menu, MenuCheckboxItem, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '../../design-system'

export interface FilterOption<T extends string> {
  value: T
  label: string
  marker?: ReactNode
  count?: number
}

export function FilterMenu<T extends string>({
  label,
  activeLabel,
  options,
  selected,
  onChange,
  clearLabel,
}: {
  /** Trigger text with nothing selected ("Todos os tipos") */
  label: string
  /** Trigger text with a selection ("2 tipos") */
  activeLabel: (count: number) => string
  options: FilterOption<T>[]
  selected: T[]
  onChange: (next: T[]) => void
  clearLabel: string
}) {
  const active = selected.length > 0
  const Chevron = Icons.dropdown
  return (
    <Menu modal={false}>
      <MenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-small font-medium transition-colors duration-fast',
            active ? 'border-accent bg-accent-weak text-accent-strong' : 'border-transparent text-ink-soft hover:bg-surface-2',
          )}
        >
          {active ? activeLabel(selected.length) : label}
          <Chevron className="h-4 w-4 text-ink-2" strokeWidth={1.75} aria-hidden />
        </button>
      </MenuTrigger>
      <MenuContent align="start" className="w-64">
        {options.map((option) => (
          <MenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) =>
              onChange(checked ? [...selected, option.value] : selected.filter((v) => v !== option.value))
            }
          >
            {option.marker}
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {option.count != null && <span className="font-mono text-mono-sm text-ink-2">{option.count}</span>}
          </MenuCheckboxItem>
        ))}
        {active && (
          <>
            <MenuSeparator />
            <MenuItem onSelect={() => onChange([])}>{clearLabel}</MenuItem>
          </>
        )}
      </MenuContent>
    </Menu>
  )
}
