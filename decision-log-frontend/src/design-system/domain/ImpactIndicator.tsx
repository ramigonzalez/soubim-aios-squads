import { useTranslation } from 'react-i18next'
import { cn } from '../cn'

export type ImpactLevel = 'low' | 'medium' | 'high'

const BARS: Record<ImpactLevel, string[]> = {
  high: ['bg-danger', 'bg-danger', 'bg-danger'],
  medium: ['bg-warning', 'bg-warning', 'bg-line'],
  low: ['bg-ink-3', 'bg-line', 'bg-line'],
}
const HEIGHTS = ['h-1.5', 'h-[9px]', 'h-3']

/** Three ascending bars + "Impacto alto | médio | baixo". Shape and text always accompany colour. */
export function ImpactIndicator({ level, className }: { level: ImpactLevel; className?: string }) {
  const { t } = useTranslation('ui')
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-caption font-medium text-ink-2', className)}>
      <span aria-hidden className="inline-flex items-end gap-0.5">
        {BARS[level].map((color, i) => (
          <span key={i} className={cn('w-[3px] rounded-[1px] print:[print-color-adjust:exact]', HEIGHTS[i], color)} />
        ))}
      </span>
      {t(`impact.${level}`)}
    </span>
  )
}
