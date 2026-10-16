/**
 * Mobile "Mais" tab (README §7): Aguardando aprovação · Trocar projeto ·
 * Compartilhar com o cliente, then the firm sections and the account
 * (the phone has no sidebar). Notificações joins this list when it exists (Phase 4).
 */
import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Count, Icons, type LucideIcon } from '../design-system'
import { ShareMilestonesDialog } from '../components/organisms/ShareMilestonesDialog'
import { ProjectSwitcherSheet } from '../components/organisms/ProjectSwitcher'
import { PageContainer, PageHeader } from '../components/templates/PageContainer'
import { useProject } from '../hooks/useProject'
import { useActiveOrganization } from '../hooks/useOrganizations'
import { useProjectList } from '../hooks/useProjectList'
import { useAuthStore } from '../store/authStore'
import { useIngestionStore } from '../store/ingestionStore'
import { ingestionService } from '../services/ingestionService'

function Row({ icon: Icon, label, trailing, onClick }: { icon: LucideIcon; label: string; trailing?: ReactNode; onClick: () => void }) {
  const Chevron = Icons.next
  return (
    <li>
      <button type="button" onClick={onClick} className="flex min-h-touch w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2">
        <Icon className="h-5 w-5 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">{label}</span>
        {trailing}
        <Chevron className="h-4 w-4 -rotate-90 text-ink-3" strokeWidth={1.75} aria-hidden />
      </button>
    </li>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-label uppercase text-ink-2">{title}</h2>
      <ul className="divide-y divide-line-soft overflow-hidden rounded-lg border border-line bg-surface">{children}</ul>
    </section>
  )
}

export default function ProjectMore() {
  const { t } = useTranslation('nav')
  const navigate = useNavigate()
  const { id = '' } = useParams<{ id: string }>()
  const { data: project } = useProject(id)
  const { user, clearAuth } = useAuthStore()
  const { isAdmin, canReviewSomewhere } = useActiveOrganization()
  const setIngestionFilter = useIngestionStore((s) => s.setFilter)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const canReview = !!project?.can_review
  const { data: list } = useProjectList(canReview)
  const pending = list?.projects.find((p) => p.id === id)?.pending_ingestion
  const { data: firmPending } = useQuery('ingestion-pending-count', ingestionService.getPendingCount, {
    staleTime: 30_000,
    enabled: canReviewSomewhere,
  })

  return (
    <PageContainer>
      <PageHeader eyebrow={t('sections.more')} title={project?.name ?? ''} />
      <Group title={t('sections.more')}>
        {canReview && (
          <Row
            icon={Icons.ingestion}
            label={t('more.approvals')}
            trailing={pending ? <span className="font-mono text-mono-sm font-semibold text-danger-ink">{pending}</span> : undefined}
            onClick={() => {
              setIngestionFilter('project_id', id)
              navigate(`/ingestion?tab=pending&project=${id}`)
            }}
          />
        )}
        <Row icon={Icons.switcher} label={t('switcher.label')} onClick={() => setSwitcherOpen(true)} />
        {project?.can_manage && <Row icon={Icons.share} label={t('more.share')} onClick={() => setShareOpen(true)} />}
      </Group>

      <Group title={t('firm')}>
        <Row icon={Icons.projects} label={t('allProjects')} onClick={() => navigate('/projects')} />
        {canReviewSomewhere && (
          <Row icon={Icons.ingestion} label={t('ingestion')} trailing={firmPending?.pending ? <Count>{firmPending.pending}</Count> : undefined} onClick={() => navigate('/ingestion')} />
        )}
        {user?.is_platform_operator && <Row icon={Icons.platform} label={t('platform')} onClick={() => navigate('/platform')} />}
      </Group>

      <Group title={t('more.account')}>
        <Row icon={Icons.integrations} label={t('integrations')} onClick={() => navigate('/settings/integrations')} />
        {isAdmin && <Row icon={Icons.team} label={t('team')} onClick={() => navigate('/settings/team')} />}
        {isAdmin && <Row icon={Icons.projects} label={t('workspace')} onClick={() => navigate('/settings/workspace')} />}
        <Row icon={Icons.password} label={t('changePassword')} onClick={() => navigate('/settings/password')} />
        <Row
          icon={Icons.logout}
          label={t('logout')}
          onClick={() => {
            clearAuth()
            navigate('/login')
          }}
        />
      </Group>

      <ProjectSwitcherSheet open={switcherOpen} onOpenChange={setSwitcherOpen} currentId={id} />
      {project?.can_manage && <ShareMilestonesDialog projectId={id} open={shareOpen} onOpenChange={setShareOpen} />}
    </PageContainer>
  )
}
