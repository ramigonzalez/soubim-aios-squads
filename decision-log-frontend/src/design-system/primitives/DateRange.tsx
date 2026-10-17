import { useTranslation } from 'react-i18next'
import { cn } from '../cn'
import { Icons } from '../icons'
import { formatDay, formatDayShortYear } from '../../lib/format'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'
import { Button } from './Button'
import { Input } from './Input'

export interface DateRangeValue {
  /** "YYYY-MM-DD" or null */
  from: string | null
  to: string | null
}

export interface DateRangeProps {
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
  /** Trigger label when empty (defaults to "Período") */
  placeholder?: string
  size?: 'form' | 'toolbar'
  className?: string
}

/** Date range trigger showing the value in mono ("15/01 → 31/08/26"), with a popover of two dates. */
export function DateRange({ value, onChange, placeholder, size = 'toolbar', className }: DateRangeProps) {
  const { t } = useTranslation('ui')
  const CalendarIcon = Icons.calendar
  const active = !!(value.from || value.to)
  const label = active ? `${value.from ? formatDay(value.from) : '…'} → ${value.to ? formatDayShortYear(value.to) : '…'}` : placeholder ?? t('dateRange.placeholder')
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 whitespace-nowrap rounded-md border px-3 text-small transition-colors duration-fast',
            size === 'form' ? 'h-[38px]' : 'h-9',
        'max-md:h-11',
            active ? 'border-accent bg-accent-weak text-accent-strong' : 'border-line-strong bg-surface text-ink hover:bg-surface-2',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 text-ink-2" strokeWidth={1.75} aria-hidden />
          <span className={cn(active && 'font-mono text-mono')}>{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex w-64 flex-col gap-3 p-3">
        <label className="flex flex-col gap-1 text-small font-semibold text-ink">
          {t('dateRange.from')}
          <Input type="date" value={value.from ?? ''} max={value.to ?? undefined} onChange={(e) => onChange({ ...value, from: e.target.value || null })} />
        </label>
        <label className="flex flex-col gap-1 text-small font-semibold text-ink">
          {t('dateRange.to')}
          <Input type="date" value={value.to ?? ''} min={value.from ?? undefined} onChange={(e) => onChange({ ...value, to: e.target.value || null })} />
        </label>
        {active && (
          <Button variant="ghost" size="sm" className="self-start px-0" onClick={() => onChange({ from: null, to: null })}>
            {t('dateRange.clear')}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
