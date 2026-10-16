import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../cn'

export interface SpinnerProps {
  className?: string
  /** Accessible label; defaults to "Carregando…" */
  label?: string
}

/** 14 px spinner. Only used inside a working button (guidelines §5). */
export function Spinner({ className, label }: SpinnerProps) {
  const { t } = useTranslation('ui')
  return (
    <Loader2
      role="status"
      aria-label={label ?? t('loading')}
      className={cn('h-3.5 w-3.5 shrink-0 motion-safe:animate-spin', className)}
      strokeWidth={2}
    />
  )
}
