import * as RadixDialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../cn'
import { Icons } from '../icons'
import { IconButton } from './IconButton'

export interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Optional trigger element (rendered with asChild) */
  trigger?: ReactNode
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  /** Footer row (buttons). Rendered under a line-soft divider. */
  footer?: ReactNode
  className?: string
}

/**
 * Dialog: 540 wide, radius lg, elev-2, scrim. Esc and scrim click close it,
 * focus is trapped (COMPONENTS.md §2). Body sections are separated by line-soft.
 */
export function Dialog({ open, onOpenChange, trigger, title, description, children, footer, className }: DialogProps) {
  const { t } = useTranslation('ui')
  const Close = Icons.close
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="ds-fade-in fixed inset-0 z-50 bg-[var(--scrim)]" />
        <RadixDialog.Content
          className={cn(
            'ds-pop-in fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-32px)] w-[540px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col',
            'rounded-lg bg-surface shadow-2 outline-none',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 px-[22px] pt-5">
            <div className="flex min-w-0 flex-col gap-1">
              <RadixDialog.Title className="text-h2 text-ink">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="text-small text-ink-2">{description}</RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <IconButton label={t('close')} icon={<Close strokeWidth={1.75} />} size="sm" variant="ghost" className="-mr-2 -mt-1" />
            </RadixDialog.Close>
          </div>
          {children && <div className="flex min-h-0 flex-col divide-y divide-line-soft overflow-y-auto px-[22px] py-4">{children}</div>}
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft px-[22px] py-4">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

export const DialogClose = RadixDialog.Close
