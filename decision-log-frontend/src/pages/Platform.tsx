import { useTranslation } from 'react-i18next'
import { CompanyInvitations } from '../components/organisms/CompanyInvitations'
import { PlatformOrganizations } from '../components/organisms/PlatformOrganizations'

/**
 * /platform (Story 12.13): the platform operator's page. Guarded by `PlatformRoute` (frontend) and
 * by `users.is_platform_operator` on every `/api/platform/*` call (backend).
 */
export default function Platform() {
  const { t } = useTranslation('platform')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-600">{t('subtitle')}</p>
        </header>
        <PlatformOrganizations />
        <CompanyInvitations />
      </div>
    </div>
  )
}
