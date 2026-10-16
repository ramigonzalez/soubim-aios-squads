import { cn } from '../cn'

export interface AvatarProps {
  name: string
  /** 20 (rows) · 22 (pills, sidebar) · 32 (headers) */
  size?: 20 | 22 | 32
  className?: string
}

const SIZES = { 20: 'h-5 w-5', 22: 'h-[22px] w-[22px]', 32: 'h-8 w-8 text-small' } as const

/** Initial in a neutral circle. Never coloured by discipline (COMPONENTS.md §2). */
export function Avatar({ name, size = 20, className }: AvatarProps) {
  const initial = name.trim().charAt(0).toLocaleUpperCase('pt-BR') || '?'
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full bg-surface-3 text-micro font-semibold text-ink',
        SIZES[size],
        className,
      )}
    >
      {initial}
    </span>
  )
}
