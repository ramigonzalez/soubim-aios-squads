import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../cn'
import { Icons } from '../icons'

export interface FieldProps {
  label: ReactNode
  /** Adds " · opcional" after the label */
  optional?: boolean
  /** Help text under the field (caption ink-2) */
  help?: ReactNode
  /** Error message: danger border on the control + helper with TriangleAlert */
  error?: ReactNode
  /** Warning message (e.g. overlapping stage dates): warning border + helper */
  warning?: ReactNode
  /** The control. It receives id, aria-describedby and tone. */
  children: ReactElement
  className?: string
}

/** Label + control + help/error/warning (COMPONENTS.md §2 Input). */
export function Field({ label, optional, help, error, warning, children, className }: FieldProps) {
  const { t } = useTranslation('ui')
  const id = useId()
  const helpId = `${id}-help`
  const messageId = `${id}-message`
  const message = error ?? warning
  const describedBy = [help ? helpId : null, message ? messageId : null].filter(Boolean).join(' ') || undefined
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: (children.props as { id?: string }).id ?? id,
        'aria-describedby': describedBy,
        tone: error ? 'error' : warning ? 'warning' : (children.props as { tone?: string }).tone,
      })
    : children
  const Warn = Icons.warning
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={(children.props as { id?: string }).id ?? id} className="text-small font-semibold text-ink">
        {label}
        {optional && <span className="font-normal text-ink-2"> · {t('optional')}</span>}
      </label>
      {control}
      {help && (
        <p id={helpId} className="text-caption text-ink-2">
          {help}
        </p>
      )}
      {message && (
        <p id={messageId} className={cn('flex items-start gap-1.5 text-caption', error ? 'text-danger-ink' : 'text-warning-ink')}>
          <Warn className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          <span>{message}</span>
        </p>
      )}
    </div>
  )
}
