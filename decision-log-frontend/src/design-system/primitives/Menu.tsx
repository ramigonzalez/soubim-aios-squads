import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { cn } from '../cn'
import { Icons } from '../icons'

/** Menu ("⋯", user menu, quiet filter menus). Radix DropdownMenu, items 32 high. */
export const Menu = Dropdown.Root
export const MenuTrigger = Dropdown.Trigger
export const MenuGroup = Dropdown.Group

export const MenuContent = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof Dropdown.Content>>(function MenuContent(
  { className, sideOffset = 4, align = 'end', ...rest },
  ref,
) {
  return (
    <Dropdown.Portal>
      <Dropdown.Content
        ref={ref}
        sideOffset={sideOffset}
        align={align}
        className={cn('ds-pop-in z-50 min-w-[180px] rounded-md bg-surface p-1 shadow-1 outline-none', className)}
        {...rest}
      />
    </Dropdown.Portal>
  )
})

const ITEM =
  'relative flex h-8 max-md:h-11 cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 text-small outline-none ' +
  'data-[highlighted]:bg-surface-2 data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-4 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-ink-2'

export interface MenuItemProps extends ComponentPropsWithoutRef<typeof Dropdown.Item> {
  icon?: ReactNode
  /** Destructive actions read danger-ink ("Arquivar", "Excluir fonte") */
  destructive?: boolean
}

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(function MenuItem(
  { className, icon, destructive, children, ...rest },
  ref,
) {
  return (
    <Dropdown.Item ref={ref} className={cn(ITEM, destructive ? 'text-danger-ink [&_svg]:text-danger-ink' : 'text-ink', className)} {...rest}>
      {icon}
      {children}
    </Dropdown.Item>
  )
})

export const MenuCheckboxItem = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof Dropdown.CheckboxItem>>(
  function MenuCheckboxItem({ className, children, ...rest }, ref) {
    const Check = Icons.check
    return (
      <Dropdown.CheckboxItem ref={ref} className={cn(ITEM, 'pr-8 text-ink', className)} {...rest}>
        {children}
        <Dropdown.ItemIndicator className="absolute right-2.5">
          <Check aria-hidden strokeWidth={1.75} />
        </Dropdown.ItemIndicator>
      </Dropdown.CheckboxItem>
    )
  },
)

export const MenuRadioGroup = Dropdown.RadioGroup

export const MenuRadioItem = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof Dropdown.RadioItem>>(function MenuRadioItem(
  { className, children, ...rest },
  ref,
) {
  const Check = Icons.check
  return (
    <Dropdown.RadioItem ref={ref} className={cn(ITEM, 'pr-8 text-ink', className)} {...rest}>
      {children}
      <Dropdown.ItemIndicator className="absolute right-2.5">
        <Check aria-hidden strokeWidth={1.75} />
      </Dropdown.ItemIndicator>
    </Dropdown.RadioItem>
  )
})

export function MenuLabel({ className, ...rest }: ComponentPropsWithoutRef<typeof Dropdown.Label>) {
  return <Dropdown.Label className={cn('px-2.5 pb-1 pt-2 text-label uppercase text-ink-2', className)} {...rest} />
}

export function MenuSeparator({ className, ...rest }: ComponentPropsWithoutRef<typeof Dropdown.Separator>) {
  return <Dropdown.Separator className={cn('my-1 h-px bg-line-soft', className)} {...rest} />
}
