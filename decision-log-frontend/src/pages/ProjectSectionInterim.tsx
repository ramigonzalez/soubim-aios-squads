/**
 * Visão geral and Reuniões before their Phase 3 screens exist
 * (REVAMP-MAPPING §7: interim, on the revamp branch only).
 */
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EmptyState, Icons } from '../design-system'
import { useProject } from '../hooks/useProject'
import { PageContainer, PageHeader } from '../components/templates/PageContainer'

export default function ProjectSectionInterim({ section }: { section: 'overview' | 'meetings' }) {
  const { t } = useTranslation('nav')
  const { id } = useParams<{ id: string }>()
  const { data: project } = useProject(id)
  const label = t(`sections.${section}`)
  const Icon = section === 'overview' ? Icons.overview : Icons.meetings
  return (
    <PageContainer>
      <PageHeader eyebrow={label} title={project?.name ?? ''} description={project?.description ?? undefined} />
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState icon={<Icon />} title={t('interim.title', { section: label })} text={t('interim.text')} />
      </div>
    </PageContainer>
  )
}
