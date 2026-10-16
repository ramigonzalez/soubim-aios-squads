import * as RadixDialog from '@radix-ui/react-dialog'
import { forwardRef, type ReactNode } from 'react'
import { cn } from '../cn'

export interface CommandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Accessible name ("Buscar") */
  title: string
  /** The search input row */
  input: ReactNode
  /** Results (listbox) and states */
  children: ReactNode
  /** Footer hint row ("↑↓ navegar · Enter abrir · Esc fechar") */
  footer?: ReactNode
}

/**
 * Global search ⌘K (UX-UI-GUIDELINES §5): Radix Dialog at the top centre, 640 wide, input on
 * top, results grouped by kind as two-line rows. Full width on phones.
 */
export function CommandDialog({ open, onOpenChange, title, input, children, footer }: CommandDialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="ds-fade-in fixed inset-0 z-50 bg-[var(--scrim)]" />
        <RadixDialog.Content
          className={cn(
            'ds-pop-in fixed inset-x-0 top-0 z-50 flex max-h-[100dvh] flex-col bg-surface shadow-2 outline-none',
            'md:left-1/2 md:right-auto md:top-[12vh] md:max-h-[70vh] md:w-[640px] md:max-w-[calc(100vw-32px)] md:-translate-x-1/2 md:rounded-lg',
          )}
        >
          <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
          <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          <div className="border-b border-line-soft">{input}</div>
          <div className="min-h-0 flex-1 overflow-y-auto py-2">{children}</div>
          {footer && <div className="hidden items-center gap-4 border-t border-line-soft px-4 py-2.5 text-caption text-ink-2 md:flex">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

export const CommandDialogClose = RadixDialog.Close

/** Group header inside the results ("Projetos", "Itens", "Reuniões"). */
export function CommandGroup({ label, children, id }: { label: ReactNode; children: ReactNode; id: string }) {
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col pb-2">
      <p id={id} className="px-4 pb-1 pt-2 text-label uppercase text-ink-2">
        {label}
      </p>
      {children}
    </div>
  )
}

export interface CommandOptionProps {
  id: string
  icon: ReactNode
  title: ReactNode
  meta?: ReactNode
  trailing?: ReactNode
  active?: boolean
  onSelect: () => void
  onHover?: () => void
}

/** Two-line result row (role option); the active one carries the accent rail. */
export const CommandOption = forwardRef<HTMLDivElement, CommandOptionProps>(function CommandOption(
  { id, icon, title, meta, trailing, active, onSelect, onHover },
  ref,
) {
  return (
    <div
      ref={ref}
      id={id}
      role="option"
      aria-selected={active}
      onClick={onSelect}
      onMouseMove={onHover}
      className={cn(
        'grid min-h-row-2 cursor-pointer grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 max-md:min-h-14',
        active ? 'bg-accent-weak shadow-rail' : 'hover:bg-surface-2',
      )}
    >
      <span className="flex items-center justify-center">{icon}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-body font-medium text-ink">{title}</span>
        {meta && <span className="flex min-w-0 items-center gap-1.5 truncate text-caption text-ink-2">{meta}</span>}
      </span>
      {trailing && <span className="font-mono text-mono-sm text-ink-2">{trailing}</span>}
    </div>
  )
})
