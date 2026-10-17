/**
 * Mobile "Aguardando aprovação" (README §7, Mais → approvals). The real model approves
 * sources, not items (inconsistency #3): each card shows the source with its candidate
 * items summarised, and [Recusar] [Aprovar] decide the whole source, with "Desfazer"
 * in the toast — the same decision as the desktop Ingestão.
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Banner,
  Button,
  DisciplineMarker,
  disciplineMeta,
  EmptyState,
  ErrorState,
  IconButton,
  Icons,
  ItemTypeIcon,
  SkeletonRows,
} from '../design-system'
import { SourceFlagBanner } from '../components/molecules/SourceFlagBanner'
import { PageContainer } from '../components/templates/PageContainer'
import { useInboxDecision } from '../hooks/useInbox'
import { useProject } from '../hooks/useProject'
import { useProjectPendingSources } from '../hooks/useProjectPendingSources'
import { formatDay } from '../lib/format'
import { sourceDate, sourceTitle } from '../lib/sources'
import type { Source } from '../types/ingestion'

const SHOWN_CANDIDATES = 3

export default function ProjectApprovals() {
  const { t } = useTranslation(['inbox', 'labels'])
  const navigate = useNavigate()
  const { id: projectId = '' } = useParams<{ id: string }>()
  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const canReview = !!project?.can_review
  const query = useProjectPendingSources(projectId, canReview)
  const { decide } = useInboxDecision()
  // decided sources leave the list at once; the refetch confirms it
  const [decided, setDecided] = useState<Set<string>>(new Set())
  const sources = (query.data?.sources ?? []).filter((s) => !decided.has(s.id))

  const onDecide = (source: Source, action: 'approve' | 'reject') => {
    setDecided((current) => new Set(current).add(source.id))
    void decide([source.id], action, projectId).finally(() =>
      setDecided((current) => {
        const next = new Set(current)
        next.delete(source.id)
        return next
      }),
    )
  }

  const Back = Icons.back
  const body = (() => {
    if (projectLoading || (canReview && query.isLoading)) return <SkeletonRows rows={3} rowClassName="h-40" />
    if (!canReview) return <Banner>{t('approvals.noAccess')}</Banner>
    if (query.isError) return <ErrorState title={t('approvals.error')} onRetry={() => void query.refetch()} />
    if (sources.length === 0)
      return (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState icon={<Icons.ingestion />} title={t('approvals.empty')} text={t('approvals.emptyText')} />
        </div>
      )
    return (
      <ul className="flex flex-col gap-3">
        {sources.map((source) => (
          <ApprovalCard key={source.id} source={source} onDecide={(action) => onDecide(source, action)} onOpen={() => navigate(`/ingestion?project=${projectId}&focus=${source.id}`)} />
        ))}
      </ul>
    )
  })()

  return (
    <PageContainer>
      <div className="flex items-center gap-2">
        <IconButton label={t('approvals.back')} icon={<Back />} size="touch" variant="ghost" onClick={() => navigate(`/projects/${projectId}/more`)} className="-ml-3" />
        <h1 className="text-h1 text-ink">{t('approvals.title')}</h1>
      </div>
      {body}
    </PageContainer>
  )
}

function ApprovalCard({ source, onDecide, onOpen }: { source: Source; onDecide: (action: 'approve' | 'reject') => void; onOpen: () => void }) {
  const { t } = useTranslation(['inbox', 'labels'])
  const candidates = source.candidates ?? []
  const shown = candidates.slice(0, SHOWN_CANDIDATES)
  const canDecide = source.can_review !== false
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <p className="text-caption text-ink-2">
        {[t(`labels:sourceType.${source.source_type}`), sourceTitle(source), formatDay(sourceDate(source))].filter(Boolean).join(' · ')}
      </p>
      {!source.candidates_ready ? (
        <p className="text-small text-ink-2">{t('panel.candidatesPending')}</p>
      ) : shown.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {shown.map((c, i) => (
            <li key={i} className="grid grid-cols-icon-line gap-2.5">
              <span className="pt-0.5">
                <ItemTypeIcon type={c.type} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body font-medium text-ink">{c.title}</span>
                <span className="flex items-center gap-2 text-caption text-ink-2">
                  <DisciplineMarker discipline={disciplineMeta(c.discipline).key} />
                  {t(`labels:itemType.${c.type}`)}
                </span>
              </span>
            </li>
          ))}
          {candidates.length > shown.length && (
            <li className="grid grid-cols-icon-line gap-2.5 text-caption text-ink-2">
              <span aria-hidden />
              {t('approvals.moreItems', { count: candidates.length - shown.length })}
            </li>
          )}
        </ul>
      ) : (
        <p className="text-small text-ink-2">{source.ai_summary || t('panel.noCandidates')}</p>
      )}
      {source.routing && <p className="text-caption text-ink-2">{t(`panel.confidence.${source.routing.confidence}`)}</p>}
      {(source.flags ?? []).map((flag, i) => (
        <SourceFlagBanner key={i} flag={flag} />
      ))}
      {canDecide && (
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" onClick={() => onDecide('reject')}>
            {t('panel.reject')}
          </Button>
          <Button size="lg" variant="primary" onClick={() => onDecide('approve')}>
            {t('panel.approve')}
          </Button>
        </div>
      )}
      <Button variant="link" size="sm" className="self-start" onClick={onOpen}>
        {t('approvals.openInbox')}
      </Button>
    </li>
  )
}
