/**
 * App sidebar (README §4, guidelines §6): wordmark + workspace, project
 * switcher, project sections, firm sections ("Escritório") and the user menu.
 * Fixed at ≥ 1024 px; the same content is the drawer below that.
 */
import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { useTranslation } from 'react-i18next'
import {
  Avatar,
  Icons,
  Kbd,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
  NavItemContent,
  navItemClass,
  Wordmark,
  type LucideIcon,
} from '../../design-system'
import { ingestionService } from '../../services/ingestionService'
import { useActiveOrganization } from '../../hooks/useOrganizations'
import { useAuthStore } from '../../store/authStore'
import { EXTERNAL_ROLE } from '../../types/organization'
import { useSearchStore } from '../../store/searchStore'
import { ProjectSwitcher, type CurrentProjectInfo } from './ProjectSwitcher'
import type { ProjectSectionCounts } from '../../types/project'

export type ProjectSection = 'overview' | 'milestones' | 'history' | 'meetings' | 'summary'

export const PROJECT_SECTIONS: { key: ProjectSection; icon: LucideIcon; count?: keyof ProjectSectionCounts }[] = [
  { key: 'overview', icon: Icons.overview },
  { key: 'milestones', icon: Icons.milestones, count: 'milestones' },
  { key: 'history', icon: Icons.history, count: 'items' },
  { key: 'meetings', icon: Icons.meetings, count: 'meetings' },
  { key: 'summary', icon: Icons.summary },
]

export interface SidebarProps {
  project: (CurrentProjectInfo & { counts?: ProjectSectionCounts }) | null
  /** The current project is still loading (avoids flashing "Escolher projeto") */
  loading?: boolean
  /** Called after a navigation (closes the drawer) */
  onNavigate?: () => void
}

export function Sidebar({ project, loading, onNavigate }: SidebarProps) {
  const { t } = useTranslation('nav')
  const { user } = useAuthStore()
  const { canReviewSomewhere } = useActiveOrganization()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-5">
        <Wordmark size={19} />
        <WorkspaceName />
      </div>

      <div className="flex flex-col gap-1 px-3">
        <ProjectSwitcher project={project} loading={loading} />
        <SearchButton onNavigate={onNavigate} />
      </div>

      <nav aria-label={t('mainNav')} className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3">
        {project && (
          <ul aria-label={t('projectNav')} className="flex flex-col gap-0.5">
            {PROJECT_SECTIONS.map(({ key, icon, count }) => (
              <li key={key}>
                <SidebarLink to={`/projects/${project.id}/${key}`} icon={icon} onNavigate={onNavigate} count={count ? project.counts?.[count] : undefined}>
                  {t(`sections.${key}`)}
                </SidebarLink>
              </li>
            ))}
          </ul>
        )}

        <hr className="my-4 border-line-soft" />
        <p className="px-2.5 pb-1.5 text-label uppercase text-ink-2">{t('firm')}</p>
        <ul className="flex flex-col gap-0.5">
          <li>
            <SidebarLink to="/projects" end icon={Icons.projects} onNavigate={onNavigate}>
              {t('allProjects')}
            </SidebarLink>
          </li>
          {canReviewSomewhere && (
            <li>
              <IngestionLink onNavigate={onNavigate} />
            </li>
          )}
          {user?.is_platform_operator && (
            <li>
              <SidebarLink to="/platform" icon={Icons.platform} onNavigate={onNavigate}>
                {t('platform')}
              </SidebarLink>
            </li>
          )}
        </ul>
      </nav>

      <div className="border-t border-line px-3 py-3">
        <UserMenu onNavigate={onNavigate} />
      </div>
    </div>
  )
}

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/** Opens the global search (⌘K). */
function SearchButton({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation('nav')
  const setOpen = useSearchStore((s) => s.setOpen)
  const Search = Icons.search
  return (
    <button
      type="button"
      onClick={() => {
        onNavigate?.()
        setOpen(true)
      }}
      aria-keyshortcuts="Meta+K Control+K"
      className={navItemClass(false)}
    >
      <Search className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-left">{t('search.open')}</span>
      <Kbd>{isMac() ? t('search.shortcut') : t('search.shortcutOther')}</Kbd>
    </button>
  )
}

function SidebarLink({
  to,
  icon: Icon,
  count,
  end,
  onNavigate,
  children,
}: {
  to: string
  icon: LucideIcon
  count?: number
  end?: boolean
  onNavigate?: () => void
  children: ReactNode
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => navItemClass(isActive)}
    >
      {({ isActive }) => (
        <NavItemContent icon={Icon} active={isActive} count={count}>
          {children}
        </NavItemContent>
      )}
    </NavLink>
  )
}

function IngestionLink({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation('nav')
  const { data } = useQuery('ingestion-pending-count', ingestionService.getPendingCount, { staleTime: 30_000 })
  return (
    <SidebarLink to="/ingestion" icon={Icons.ingestion} count={data?.pending} onNavigate={onNavigate}>
      {t('ingestion')}
    </SidebarLink>
  )
}

/** Workspace (firm) name; a menu to switch when the user belongs to several. */
function WorkspaceName() {
  const { t } = useTranslation('nav')
  const { t: tc } = useTranslation('common')
  const { organizations, active, setActive } = useActiveOrganization()
  if (!active) return null
  // Story 12.15: an organization where the user is an external person is marked "Externo"
  const label = (org: { name: string; role: string }) => (org.role === EXTERNAL_ROLE ? `${org.name} (${tc('external.badge')})` : org.name)
  if (organizations.length < 2) {
    return <span className="min-w-0 truncate text-micro text-ink-2">{label(active)}</span>
  }
  const Chevron = Icons.dropdown
  return (
    <Menu>
      <MenuTrigger asChild>
        <button type="button" aria-label={t('organization')} className="flex min-w-0 items-center gap-0.5 rounded-sm text-micro text-ink-2 hover:text-ink">
          <span className="truncate">{label(active)}</span>
          <Chevron className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden />
        </button>
      </MenuTrigger>
      <MenuContent align="end">
        <MenuLabel>{t('organization')}</MenuLabel>
        <MenuRadioGroup value={active.id} onValueChange={setActive}>
          {organizations.map((org) => (
            <MenuRadioItem key={org.id} value={org.id}>
              {label(org)}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  )
}

/** Footer: avatar, name and organization role; the account menu (settings live here, guidelines §6). */
export function UserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation('nav')
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const { active, isAdmin } = useActiveOrganization()
  if (!user) return null
  const go = (path: string) => {
    onNavigate?.()
    navigate(path)
  }
  return (
    <Menu>
      <MenuTrigger asChild>
        <button type="button" aria-label={t('userMenu')} className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left hover:bg-surface-2">
          <Avatar name={user.name} size={32} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-small font-semibold text-ink">{user.name}</span>
            {active && <span className="truncate text-caption text-ink-2">{t(`orgRoles.${active.role}`)}</span>}
          </span>
        </button>
      </MenuTrigger>
      <MenuContent side="top" align="start" className="w-56">
        <MenuItem icon={<Icons.integrations />} onSelect={() => go('/settings/integrations')}>
          {t('integrations')}
        </MenuItem>
        {isAdmin && (
          <MenuItem icon={<Icons.team />} onSelect={() => go('/settings/team')}>
            {t('team')}
          </MenuItem>
        )}
        {isAdmin && (
          <MenuItem icon={<Icons.projects />} onSelect={() => go('/settings/workspace')}>
            {t('workspace')}
          </MenuItem>
        )}
        <MenuItem icon={<Icons.password />} onSelect={() => go('/settings/password')}>
          {t('changePassword')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          icon={<Icons.logout />}
          onSelect={() => {
            clearAuth()
            go('/login')
          }}
        >
          {t('logout')}
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}
