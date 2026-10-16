import type { ReactNode } from 'react'
import { cn } from '../cn'
import type { LucideIcon } from '../icons'

/**
 * Mobile tab bar (COMPONENTS.md → Mobile shell): 4 equal tabs, 50 px + safe
 * area, icon 22 + label 11. Active: ink 700; inactive: ink-3 500. Hidden ≥ 768.
 */
export function TabBar({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid h-[50px] grid-cols-4">{children}</ul>
    </nav>
  )
}

/** Classes for a tab link (use with a router NavLink). */
export function tabBarItemClass(active: boolean) {
  return cn(
    'flex h-full min-w-touch flex-col items-center justify-center gap-0.5 text-micro',
    active ? 'font-bold text-ink' : 'font-medium text-ink-3',
  )
}

export function TabBarItemContent({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <>
      <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden />
      <span>{label}</span>
    </>
  )
}

/** Keeps page content clear of the fixed tab bar on phones. */
export function TabBarSpacer() {
  return <div aria-hidden className="h-[calc(50px+env(safe-area-inset-bottom))] md:hidden" />
}

/** Top bar below 1024 px: 56 px, surface, bottom line, sticky. */
export function TopBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header className={cn('sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-line bg-surface px-2 lg:hidden', className)}>
      {children}
    </header>
  )
}
