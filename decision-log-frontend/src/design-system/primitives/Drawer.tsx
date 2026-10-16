import * as RadixDialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { cn } from '../cn'

export interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Accessible name */
  title: string
  children: ReactNode
  className?: string
}

/**
 * Off-canvas drawer from the left (the sidebar below 1024 px, guidelines §4).
 * Scrim, focus trap and Esc come from Radix Dialog. New pattern, flagged for design review.
 */
export function Drawer({ open, onOpenChange, title, children, className }: DrawerProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="ds-fade-in fixed inset-0 z-50 bg-[var(--scrim)]" />
        <RadixDialog.Content
          className={cn(
            'ds-slide-in-left fixed bottom-0 left-0 top-0 z-50 flex w-sidebar max-w-[85vw] flex-col bg-surface shadow-2 outline-none',
            className,
          )}
        >
          <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
          <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
