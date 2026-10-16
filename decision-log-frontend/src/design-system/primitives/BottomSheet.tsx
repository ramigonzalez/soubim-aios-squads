import * as RadixDialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { cn } from '../cn'

export interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  /** Optional ghost action in the title row ("Limpar") */
  action?: ReactNode
  /** Sticky footer CTA (44 px primary), above the safe area */
  footer?: ReactNode
  children: ReactNode
  className?: string
}

/** Mobile sheet: full width, 12 px top corners, grab handle, scrim (COMPONENTS.md §2). */
export function BottomSheet({ open, onOpenChange, title, action, footer, children, className }: BottomSheetProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="ds-fade-in fixed inset-0 z-50 bg-[var(--scrim)]" />
        <RadixDialog.Content
          className={cn(
            'ds-slide-in-up fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-[12px] bg-surface shadow-2 outline-none',
            className,
          )}
        >
          <div className="flex justify-center pb-1 pt-2" aria-hidden>
            <span className="h-1 w-9 rounded-full bg-line-strong" />
          </div>
          <div className="flex min-h-touch items-center justify-between gap-3 px-4">
            <RadixDialog.Title className="text-h3 text-ink">{title}</RadixDialog.Title>
            {action}
          </div>
          <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
          {footer && (
            <div className="border-t border-line-soft bg-surface px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">{footer}</div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
