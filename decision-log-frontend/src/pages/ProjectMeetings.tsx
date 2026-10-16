/** Reuniões (README §5.6): the project's approved meetings; a row opens the meeting viewer. */
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EmptyState, ErrorState, Icons, MeetingRow, RowList, SkeletonRows, SourceTile } from '../design-system'
import { ProjectHeader } from '../components/organisms/ProjectHeader'
import { PageContainer } from '../components/templates/PageContainer'
import { useProjectMeetings } from '../hooks/useProjectMeetings'
import { formatDay, formatDuration } from '../lib/format'

export default function ProjectMeetings() {
  const { t } = useTranslation('project')
  const navigate = useNavigate()
  const { id: projectId = '' } = useParams<{ id: string }>()
  const meetings = useProjectMeetings(projectId)

  return (
    <PageContainer>
      <ProjectHeader projectId={projectId} section="meetings" />
      {meetings.isLoading && <SkeletonRows rows={5} rowClassName="h-row-2" className="rounded-lg border border-line bg-surface" />}
      {meetings.isError && <ErrorState title={t('meetings.error')} onRetry={() => void meetings.refetch()} />}
      {meetings.data?.length === 0 && (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState icon={<Icons.meetings />} title={t('meetings.emptyTitle')} text={t('meetings.emptyText')} />
        </div>
      )}
      {meetings.data && meetings.data.length > 0 && (
        <RowList>
          {meetings.data.map((meeting) => (
            <MeetingRow
              key={meeting.id}
              tile={<SourceTile type="meeting" />}
              title={meeting.title || t('viewer.untitled')}
              meta={[
                formatDay(meeting.occurred_at),
                meeting.duration_minutes ? formatDuration(meeting.duration_minutes) : null,
                meeting.label,
                meeting.participants.length ? meeting.participants.join(', ') : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              count={meeting.item_count ? t('meetings.count', { count: meeting.item_count }) : t('meetings.noItems')}
              onClick={() => navigate(`/projects/${projectId}/meetings/${meeting.id}`)}
            />
          ))}
        </RowList>
      )}
    </PageContainer>
  )
}
