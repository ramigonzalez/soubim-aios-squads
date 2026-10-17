import { useTranslation } from 'react-i18next'
import { cn } from '../cn'

export interface WordmarkProps {
  /** Font size in px: 19 sidebar · 22 landing header · 13 public footer (min 13) */
  size?: number
  tone?: 'ink' | 'white'
  /** Adds "by souBIM" below at 0.48× */
  endorsed?: boolean
  className?: string
}

/**
 * "pro|mem" built live in CSS (brand/BRAND.md): "pro" 700, a vertical bar in
 * the accent, "mem" 500, letter-spacing −0.04em, all lowercase.
 */
export function Wordmark({ size = 19, tone = 'ink', endorsed = false, className }: WordmarkProps) {
  const { t } = useTranslation('ui')
  const fontSize = Math.max(13, size)
  return (
    <span role="img" aria-label={t('wordmark.label')} className={cn('inline-flex flex-col items-start', className)} style={{ fontSize }}>
      <span aria-hidden className={cn('inline-flex items-center font-sans leading-none tracking-[-0.04em]', tone === 'ink' ? 'text-ink' : 'text-bg')}>
        <span className="font-bold">pro</span>
        <span
          className={cn('mx-[0.1em] inline-block h-[0.95em] w-[max(1px,0.0714em)] translate-y-[0.06em]', tone === 'ink' ? 'bg-accent' : 'bg-bg')}
        />
        <span className="font-medium">mem</span>
      </span>
      {endorsed && (
        <span aria-hidden className="mt-[0.09em] text-[0.48em] font-normal leading-none text-ink-2">
          {t('wordmark.endorsed')}
        </span>
      )}
    </span>
  )
}
