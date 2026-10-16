import { useTranslation } from 'react-i18next'
import { CompanyInvitations } from '../components/organisms/CompanyInvitations'
import { PlatformOrganizations } from '../components/organisms/PlatformOrganizations'
import { PageContainer, PageHeader } from '../components/templates/PageContainer'

/**
 * /platform (Story 12.13): the platform operator's page. Guarded by `PlatformRoute` (frontend) and
 * by `users.is_platform_operator` on every `/api/platform/*` call (backend).
 * Promem revamp Phase 4c: page anatomy (eyebrow, h1, description) and section blocks.
 */
export default function Platform() {
  const { t } = useTranslation('platform')

  return (
    <PageContainer>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('subtitle')} />
      <PlatformOrganizations />
      <CompanyInvitations />
    </PageContainer>
  )
}
