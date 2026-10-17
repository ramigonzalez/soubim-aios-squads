/**
 * Projetos (README §5.8): one row per project with its current stage, news since
 * the last visit and what needs attention. Search, Ativos | Arquivados, "Só com
 * pendências" and the sort live in the URL.
 */
import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  IconButton,
  Icons,
  Input,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  MiniStageBar,
  ProjectRow,
  ProjectTableHeader,
  RowList,
  SegmentedControl,
  Select,
  SkeletonRows,
} from '../design-system'
import { PageContainer, PageHeader } from '../components/templates/PageContainer'
import { useActiveOrganization } from '../hooks/useOrganizations'
import api from '../services/api'
import { formatDay, formatRelativeDay } from '../lib/format'
import { summarizeStages } from '../lib/projectStage'
import { layoutStages } from '../lib/stages'
import type { Project, ProjectsResponse } from '../types/project'

type Sort = 'activity' | 'attention' | 'name' | 'stage'
const SORTS: Sort[] = ['activity', 'attention', 'name', 'stage']

/** Attention score (README §9.2): late × 10 + pending (+ open topics, once topics have a status). */
export const attention = (p: Project) => (p.late_actions ?? 0) * 10 + (p.pending_ingestion ?? 0)

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR')

export default function ProjectsList() {
  const { t } = useTranslation('project')
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { active: organization, isAdmin } = useActiveOrganization()
  const archived = params.get('status') === 'archived'
  const onlyAttention = params.get('attention') === '1'
  const q = params.get('q') ?? ''
  const sort: Sort = SORTS.includes(params.get('sort') as Sort) ? (params.get('sort') as Sort) : 'activity'

  const query = useQuery<ProjectsResponse, Error>(
    ['projects', { limit: 100, offset: 0, archived }],
    async () => (await api.get<ProjectsResponse>('/projects', { params: { limit: 100, offset: 0, archived } })).data,
    { staleTime: 60 * 1000 },
  )

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const all = useMemo(() => (query.data?.projects ?? []).filter((p) => (archived ? !!p.archived_at : !p.archived_at)), [query.data, archived])
  const rows = useMemo(() => {
    const needle = normalize(q.trim())
    const filtered = all
      .filter((p) => !needle || normalize(`${p.name} ${p.description ?? ''}`).includes(needle))
      .filter((p) => !onlyAttention || attention(p) > 0)
    const byName = (a: Project, b: Project) => a.name.localeCompare(b.name, 'pt-BR')
    const stageIndex = (p: Project) => layoutStages(p.stages ?? []).currentIndex
    return [...filtered].sort((a, b) => {
      if (sort === 'name') return byName(a, b)
      if (sort === 'attention') return attention(b) - attention(a) || byName(a, b)
      if (sort === 'stage') return stageIndex(b) - stageIndex(a) || byName(a, b)
      return (b.last_activity?.at ?? '').localeCompare(a.last_activity?.at ?? '') || byName(a, b)
    })
  }, [all, q, onlyAttention, sort])

  const needing = all.filter((p) => attention(p) > 0).length

  return (
    <PageContainer>
      <PageHeader
        eyebrow={organization ? t('projectsPage.eyebrow', { org: organization.name }) : t('projectsPage.eyebrowNoOrg')}
        title={t('projectsPage.title')}
        description={
          query.data && !archived
            ? `${t('projectsPage.summary', { count: all.length })} · ${t('projectsPage.attention', { count: needing })}`
            : undefined
        }
        actions={
          isAdmin ? (
            <Button variant="primary" icon={<Icons.add />} onClick={() => navigate('/projects/new')}>
              {t('projectsPage.create')}
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          size="toolbar"
          className="min-w-60 flex-1"
          value={q}
          onChange={(e) => set('q', e.target.value || null)}
          placeholder={t('projectsPage.search')}
          aria-label={t('projectsPage.search')}
          leadingIcon={<Icons.search />}
        />
        <SegmentedControl
          label={t('projectsPage.title')}
          value={archived ? 'archived' : 'active'}
          onValueChange={(v) => set('status', v === 'archived' ? 'archived' : null)}
          options={[
            { value: 'active', label: t('projectsPage.active') },
            { value: 'archived', label: t('projectsPage.archived') },
          ]}
        />
        <Checkbox checked={onlyAttention} onCheckedChange={(on) => set('attention', on ? '1' : null)} label={t('projectsPage.onlyAttention')} />
        <Select
          size="toolbar"
          className="w-64"
          aria-label={t('projectsPage.sortBy')}
          value={sort}
          onValueChange={(v) => set('sort', v === 'activity' ? null : v)}
          options={SORTS.map((s) => ({ value: s, label: `${t('projectsPage.sortBy')}: ${t(`projectsPage.sort.${s}`)}` }))}
        />
      </div>

      {query.isLoading && <SkeletonRows rows={6} rowClassName="h-20" className="rounded-lg border border-line bg-surface" />}
      {query.isError && <ErrorState title={t('projectsPage.error')} onRetry={() => void query.refetch()} />}
      {query.data && rows.length === 0 && (
        <div className="rounded-lg border border-line bg-surface">
          {all.length === 0 && !archived ? (
            <EmptyState
              icon={<Icons.projects />}
              title={t('projectsPage.emptyFirst')}
              text={t('projectsPage.emptyFirstText')}
              action={isAdmin ? <Button variant="primary" onClick={() => navigate('/projects/new')}>{t('projectsPage.create')}</Button> : undefined}
            />
          ) : (
            <EmptyState icon={<Icons.search />} title={t('projectsPage.empty')} text={t('projectsPage.emptyText')} />
          )}
        </div>
      )}
      {rows.length > 0 && (
        <RowList>
          <ProjectTableHeader columns={[t('projectsPage.columns.project'), t('projectsPage.columns.stage'), t('projectsPage.columns.news')]} />
          {rows.map((project) => (
            <ProjectListRow key={project.id} project={project} onOpen={() => navigate(`/projects/${project.id}/overview`)} onEdit={() => navigate(`/projects/${project.id}/edit`)} />
          ))}
        </RowList>
      )}
    </PageContainer>
  )
}

function ProjectListRow({ project, onOpen, onEdit }: { project: Project; onOpen: () => void; onEdit: () => void }) {
  const { t } = useTranslation('project')
  const stage = summarizeStages(project.stages)
  const news = project.new_items?.count ?? 0
  const late = project.late_actions ?? 0
  const pending = project.pending_ingestion ?? 0
  const Team = Icons.team
  return (
    <ProjectRow
      muted={!!project.archived_at}
      onOpen={onOpen}
      name={project.name}
      meta={
        <>
          {project.description && <span className="truncate">{project.description}</span>}
          {project.description && <span aria-hidden>·</span>}
          <Team className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="shrink-0">{t('projectsPage.team', { count: project.member_count ?? 0 })}</span>
        </>
      }
      stageBar={project.stages?.length ? <MiniStageBar stages={project.stages} /> : undefined}
      stageName={stage.currentName ?? stage.label}
      stageNote={project.archived_at ? t('projectsPage.archivedOn', { date: formatDay(project.archived_at) }) : stage.daysLeft ?? undefined}
      news={t('projectsPage.new', { count: news })}
      activity={project.last_activity ? `${formatRelativeDay(project.last_activity.at)} · ${project.last_activity.label}` : undefined}
      badges={
        late || pending ? (
          <>
            {late > 0 && <Badge tone="danger">{t('projectsPage.late', { count: late })}</Badge>}
            {pending > 0 && <Badge tone="neutral">{t('projectsPage.pending', { count: pending })}</Badge>}
          </>
        ) : (
          <span className="text-caption text-ink-3">{t('projectsPage.clear')}</span>
        )
      }
      menu={
        project.can_manage ? (
          <Menu>
            <MenuTrigger asChild>
              <IconButton label={t('projectsPage.more', { name: project.name })} icon={<Icons.more />} size="sm" variant="ghost" />
            </MenuTrigger>
            <MenuContent>
              <MenuItem icon={<Icons.manual />} onSelect={onEdit}>
                {t('projectsPage.edit')}
              </MenuItem>
            </MenuContent>
          </Menu>
        ) : undefined
      }
    />
  )
}
