import * as RadixTabs from '@radix-ui/react-tabs'
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { cn } from '../cn'

/** Underline tabs, only inside panels or one page (guidelines §5). Radix Tabs. */
export const Tabs = RadixTabs.Root

export const TabsList = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof RadixTabs.List>>(function TabsList(
  { className, ...rest },
  ref,
) {
  return <RadixTabs.List ref={ref} className={cn('flex gap-5 border-b border-line-soft', className)} {...rest} />
})

export interface TabProps extends ComponentPropsWithoutRef<typeof RadixTabs.Trigger> {
  /** Count after the label, mono-sm ("Similares 3") */
  count?: ReactNode
}

export const Tab = forwardRef<HTMLButtonElement, TabProps>(function Tab({ className, count, children, ...rest }, ref) {
  return (
    <RadixTabs.Trigger
      ref={ref}
      className={cn(
        'ds-touch -mb-px inline-flex h-9 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent text-small font-medium text-ink-2',
        'transition-colors duration-fast ease-promem hover:text-ink',
        'data-[state=active]:border-ink data-[state=active]:font-semibold data-[state=active]:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
      {count != null && <span className="font-mono text-mono-sm font-normal text-ink-2">{count}</span>}
    </RadixTabs.Trigger>
  )
})

export const TabsContent = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof RadixTabs.Content>>(function TabsContent(
  { className, ...rest },
  ref,
) {
  return <RadixTabs.Content ref={ref} className={cn('outline-none', className)} {...rest} />
})
