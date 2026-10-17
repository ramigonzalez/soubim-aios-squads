import * as RadixDialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { cn } from '../cn'

export interface SidePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Accessible name (visually the panel draws its own header) */
  title: string
  children: ReactNode
  className?: string
}

/**
 * Item detail panel: fixed right, 480 px (full width below 1024), elev-2,
 * slides in from the right. No scrim: the list behind stays visible and
 * interactive, so outside clicks don't close it (COMPONENTS.md §2).
 * Esc closes it and Radix returns focus to the element that opened it.
 */
export function SidePanel({ open, onOpenChange, title, children, className }: SidePanelProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <RadixDialog.Portal>
        <RadixDialog.Content
          onInteractOutside={(event) => event.preventDefault()}
          className={cn(
            'ds-slide-in-right fixed bottom-0 right-0 top-0 z-40 flex w-full flex-col bg-surface shadow-2 outline-none lg:w-panel lg:max-w-[100vw]',
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

export const SidePanelClose = RadixDialog.Close
