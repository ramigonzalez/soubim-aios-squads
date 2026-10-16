/**
 * Old URLs keep working (README §4):
 * - /projects/:id (#milestones | #history | #digest) → /projects/:id/<section>; the default is Visão geral
 * - /meetings/:sourceId?t= → /projects/:projectId/meetings/:sourceId?t=
 */
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ErrorState, SkeletonRows } from '../../design-system'
import { useMeeting } from '../../hooks/useMeeting'
import { PageContainer } from '../templates/PageContainer'

const HASH_SECTIONS: Record<string, string> = {
  milestones: 'milestones',
  history: 'history',
  digest: 'summary',
}

export function ProjectIndexRedirect() {
  const { id } = useParams<{ id: string }>()
  const { hash, search } = useLocation()
  const section = HASH_SECTIONS[hash.replace('#', '')] ?? 'overview'
  return <Navigate to={`/projects/${id}/${section}${search}`} replace />
}

export function LegacyMeetingRedirect() {
  const { t } = useTranslation('meeting')
  const { sourceId = '' } = useParams<{ sourceId: string }>()
  const { search } = useLocation()
  const { data, isLoading, isError, refetch } = useMeeting(sourceId)
  if (data) return <Navigate to={`/projects/${data.project_id}/meetings/${sourceId}${search}`} replace />
  return (
    <PageContainer>
      {isLoading && <SkeletonRows rows={4} />}
      {isError && <ErrorState title={t('loadError')} onRetry={() => void refetch()} />}
    </PageContainer>
  )
}
