/**
 * SettingsCard — one box of the project settings page (Story 12.15, project settings layout).
 *
 * Sections that save on their own (sharing, Drive folder, external people, Fathom rules) say so with a
 * muted "Salvo automaticamente" note, so nobody expects the project form's "Salvar alterações" to save them.
 * Sections render the card themselves: a section that renders nothing (403) leaves no empty box.
 */
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface SettingsCardProps {
  titleId: string
  title: string
  description?: string
  autoSaved?: boolean
  children?: ReactNode
}

export const SETTINGS_CARD_CLASS = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6'

export function SettingsCard({ titleId, title, description, autoSaved = false, children }: SettingsCardProps) {
  const { t } = useTranslation('projects')
  return (
    <section className={`${SETTINGS_CARD_CLASS} space-y-4`} aria-labelledby={titleId}>
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id={titleId} className="text-lg font-medium text-gray-900">
            {title}
          </h2>
          {autoSaved && <span className="text-xs text-gray-400">{t('settings.autoSaved')}</span>}
        </div>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      {children}
    </section>
  )
}
