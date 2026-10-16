/**
 * Project switcher (README §4): the current project and its stage; opens a
 * list of active projects with their stage, news since the last visit and
 * last activity, plus "Criar projeto". Popover on desktop, BottomSheet on mobile.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BottomSheet,
  Button,
  cn,
  ErrorState,
  Icons,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SkeletonRows,
} from '../../design-system'
import { useProjectList } from '../../hooks/useProjectList'
import { useActiveOrganization } from '../../hooks/useOrganizations'
import { formatRelativeDay } from '../../lib/format'
import { summarizeStages } from '../../lib/projectStage'
import type { Project, ProjectStageRef } from '../../types/project'

export interface CurrentProjectInfo {
  id: string
  name: string
  stages?: ProjectStageRef[]
}

interface SwitcherListProps {
  currentId: string | null
  onPick: (projectId: string) => void
  onCreate: (() => void) | null
}

/** Search + active projects + "Criar projeto"; shared by the popover and the sheet. */
function SwitcherList({ currentId, onPick, onCreate }: SwitcherListProps) {
  const { t } = useTranslation('nav')
  const [query, setQuery] = useState('')
  const { data, isLoading, isError, refetch } = useProjectList()
  const projects = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('pt-BR')
    const list = data?.projects ?? []
    return q ? list.filter((p) => p.name.toLocaleLowerCase('pt-BR').includes(q)) : list
  }, [data, query])
  const Plus = Icons.add
  const Search = Icons.search

  return (
    <div className="flex flex-col gap-2">
      <Input
        size="toolbar"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('switcher.search')}
        aria-label={t('switcher.search')}
        leadingIcon={<Search />}
      />
      <p className="px-1 pt-1 text-label uppercase text-ink-2">{t('switcher.active')}</p>
      {isLoading && <SkeletonRows rows={3} rowClassName="h-row-2" />}
      {isError && <ErrorState title={t('switcher.loadError')} onRetry={() => void refetch()} className="py-4" />}
      {!isLoading && !isError && projects.length === 0 && <p className="px-1 py-3 text-small text-ink-2">{t('switcher.empty')}</p>}
      {projects.length > 0 && (
        <ul className="-mx-1 flex max-h-80 flex-col overflow-y-auto" role="list">
          {projects.map((project) => (
            <li key={project.id}>
              <SwitcherRow project={project} current={project.id === currentId} onPick={onPick} />
            </li>
          ))}
        </ul>
      )}
      {onCreate && (
        <Button variant="ghost" size="sm" icon={<Plus />} className="justify-start px-1" onClick={onCreate}>
          {t('switcher.create')}
        </Button>
      )}
    </div>
  )
}

function SwitcherRow({ project, current, onPick }: { project: Project; current: boolean; onPick: (id: string) => void }) {
  const { t } = useTranslation('nav')
  const stage = summarizeStages(project.stages)
  const news = project.new_items?.count ?? 0
  return (
    <button
      type="button"
      aria-current={current || undefined}
      onClick={() => onPick(project.id)}
      className={cn(
        'flex w-full flex-col gap-0.5 rounded-md px-2 py-2 text-left hover:bg-surface-2',
        current && 'bg-accent-weak shadow-rail hover:bg-accent-weak',
      )}
    >
      <span className="truncate text-small font-semibold text-ink">{project.name}</span>
      <span className="flex min-w-0 items-center gap-1 text-caption text-ink-2">
        <span className="truncate">{stage.label}</span>
        <span aria-hidden>·</span>
        <span className={cn('shrink-0', news > 0 ? 'font-semibold text-ink' : undefined)}>{t('switcher.new', { count: news })}</span>
        {project.last_activity && (
          <>
            <span aria-hidden>·</span>
            <span className="shrink-0 font-mono text-mono-sm">{formatRelativeDay(project.last_activity.at)}</span>
          </>
        )}
      </span>
    </button>
  )
}

function useSwitcherActions(close: () => void) {
  const navigate = useNavigate()
  const { isAdmin } = useActiveOrganization()
  return {
    onPick: (projectId: string) => {
      close()
      navigate(`/projects/${projectId}/overview`)
    },
    // the backend lets organization owners/admins create projects
    onCreate: isAdmin
      ? () => {
          close()
          navigate('/projects/new')
        }
      : null,
  }
}

/** Sidebar card: project name + stage, ChevronsUpDown, opens the popover. */
export function ProjectSwitcher({ project }: { project: CurrentProjectInfo | null }) {
  const { t } = useTranslation('nav')
  const [open, setOpen] = useState(false)
  const actions = useSwitcherActions(() => setOpen(false))
  const Chevrons = Icons.switcher
  const stage = project ? summarizeStages(project.stages) : null
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('switcher.label')}
          className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-left hover:bg-surface-2"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-small font-semibold text-ink">{project?.name ?? t('switcher.choose')}</span>
            {stage && <span className="truncate text-caption text-ink-2">{stage.label}</span>}
          </span>
          <Chevrons className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" side="bottom" align="start">
        <SwitcherList currentId={project?.id ?? null} {...actions} />
      </PopoverContent>
    </Popover>
  )
}

/** Mobile: the same list in a BottomSheet ("Trocar projeto"). */
export function ProjectSwitcherSheet({
  open,
  onOpenChange,
  currentId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentId: string | null
}) {
  const { t } = useTranslation('nav')
  const actions = useSwitcherActions(() => onOpenChange(false))
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={t('switcher.label')}>
      <SwitcherList currentId={currentId} {...actions} />
    </BottomSheet>
  )
}

/** Mobile top-bar trigger: project name ▾ + stage line. */
export function ProjectSwitcherTrigger({
  project,
  onClick,
  trailing,
}: {
  project: CurrentProjectInfo
  onClick: () => void
  trailing?: ReactNode
}) {
  const { t } = useTranslation('nav')
  const stage = summarizeStages(project.stages)
  const Chevron = Icons.dropdown
  return (
    <button type="button" onClick={onClick} aria-label={t('switcher.label')} className="flex min-h-touch min-w-0 flex-col justify-center text-left">
      <span className="flex min-w-0 items-center gap-1 text-h3 text-ink">
        <span className="truncate">{project.name}</span>
        <Chevron className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="truncate text-caption text-ink-2">
        {stage.label}
        {stage.daysLeft && ` · ${stage.daysLeft}`}
      </span>
      {trailing}
    </button>
  )
}
