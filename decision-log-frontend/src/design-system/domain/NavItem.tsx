import type { ReactNode } from 'react'
import type { LucideIcon } from '../icons'
import { cn } from '../cn'
import { Count } from '../primitives/Badge'

/**
 * Sidebar nav item (README §4): small 500, 16 px ink-2 icon, padding 7/10,
 * radius md. Active: accent-weak fill, 600, accent icon. Count in mono-sm.
 * Use the class with a router link and NavItemContent as its children.
 */
export function navItemClass(active: boolean, className?: string) {
  return cn(
    'group flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-small font-medium text-ink transition-colors duration-fast',
    active ? 'bg-accent-weak font-semibold' : 'hover:bg-surface-2',
    className,
  )
}

export function NavItemContent({ icon: Icon, active, count, children }: { icon: LucideIcon; active: boolean; count?: number; children: ReactNode }) {
  return (
    <>
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-accent' : 'text-ink-2')} strokeWidth={1.75} />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count != null && <Count>{count}</Count>}
    </>
  )
}
