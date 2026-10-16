import * as RadixPopover from '@radix-ui/react-popover'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from '../cn'

/** Popover: surface, radius md, elev-1, padding 4 (COMPONENTS.md §2). */
export const Popover = RadixPopover.Root
export const PopoverTrigger = RadixPopover.Trigger
export const PopoverAnchor = RadixPopover.Anchor
export const PopoverClose = RadixPopover.Close

export const PopoverContent = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof RadixPopover.Content>>(
  function PopoverContent({ className, sideOffset = 4, align = 'start', ...rest }, ref) {
    return (
      <RadixPopover.Portal>
        <RadixPopover.Content
          ref={ref}
          sideOffset={sideOffset}
          align={align}
          className={cn('ds-pop-in z-50 rounded-md bg-surface p-1 shadow-1 outline-none', className)}
          {...rest}
        />
      </RadixPopover.Portal>
    )
  },
)
