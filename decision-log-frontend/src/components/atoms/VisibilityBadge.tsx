/**
 * Meeting visibility badge (Story 12.4): "Interna" (owner organization only) / "Compartilhada"
 * (every organization on the project).
 */
import { useTranslation } from 'react-i18next'
import { Lock, Users } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { MeetingVisibility } from '../../types/projectItem'

interface VisibilityBadgeProps {
  visibility?: MeetingVisibility | null
  className?: string
}

export function VisibilityBadge({ visibility, className }: VisibilityBadgeProps) {
  const { t } = useTranslation('common')
  if (!visibility) return null
  const shared = visibility === 'shared'
  const Icon = shared ? Users : Lock

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        shared ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600',
        className,
      )}
      title={t(shared ? 'visibility.sharedHint' : 'visibility.internalHint')}
      data-testid="visibility-badge"
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {t(shared ? 'visibility.shared' : 'visibility.internal')}
    </span>
  )
}
