/**
 * Promem app shell (README §4, §5.1, §7, §8.4).
 *
 * - ≥ 1024: fixed 248 px sidebar; content to its right.
 * - 768–1023: top bar with a menu button; the sidebar opens as a drawer.
 * - < 768: mobile shell. On project pages: top bar with the project switcher
 *   and a bottom tab bar (Visão geral · Marcos · Histórico · Mais). On firm
 *   pages: top bar with the menu button and the wordmark.
 */
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Banner,
  Drawer,
  IconButton,
  Icons,
  TabBar,
  TabBarItemContent,
  TabBarSpacer,
  tabBarItemClass,
  TopBar,
  Wordmark,
} from '../../design-system'
import { useCurrentProjectId } from '../../hooks/useCurrentProject'
import { useActiveOrganization } from '../../hooks/useOrganizations'
import { useProject } from '../../hooks/useProject'
import { useProjectVisit } from '../../hooks/useProjectVisit'
import { Sidebar } from '../organisms/Sidebar'
import { ProjectSwitcherSheet, ProjectSwitcherTrigger } from '../organisms/ProjectSwitcher'
import { GlobalSearch, useSearchShortcut } from '../organisms/GlobalSearch'
import { useSearchStore } from '../../store/searchStore'

const MOBILE_TABS = [
  { key: 'overview', icon: Icons.overview },
  { key: 'milestones', icon: Icons.milestones },
  { key: 'history', icon: Icons.history },
  { key: 'more', icon: Icons.more },
] as const

export function AppShell() {
  const { t } = useTranslation('nav')
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const { projectId, fromRoute, forget } = useCurrentProjectId()
  const projectQuery = useProject(projectId ?? undefined)
  useProjectVisit(fromRoute ? projectId ?? undefined : undefined)
  useSearchShortcut()
  const openSearch = useSearchStore((s) => s.setOpen)

  // A remembered project the user can no longer open (archived, access removed) is dropped.
  useEffect(() => {
    if (!fromRoute && projectQuery.isError) forget()
  }, [fromRoute, projectQuery.isError, forget])

  // Close the drawer on navigation (also covers browser Back).
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  const project = projectQuery.data
    ? { id: projectQuery.data.id, name: projectQuery.data.name, stages: projectQuery.data.stages, counts: projectQuery.data.counts }
    : null
  const onProjectPage = fromRoute && !!project
  const MenuIcon = Icons.menu

  return (
    <div className="min-h-screen bg-bg">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-1">
        {t('skipToContent')}
      </a>

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-sidebar border-r border-line bg-surface lg:flex lg:flex-col">
        <Sidebar project={project} loading={!!projectId && projectQuery.isLoading} />
      </aside>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title={t('mainNav')}>
        <Sidebar project={project} loading={!!projectId && projectQuery.isLoading} onNavigate={() => setDrawerOpen(false)} />
      </Drawer>

      <TopBar>
        <IconButton
          label={t('openMenu')}
          icon={<MenuIcon />}
          size="touch"
          variant="ghost"
          onClick={() => setDrawerOpen(true)}
          className={onProjectPage ? 'hidden md:inline-flex' : undefined}
        />
        {onProjectPage ? (
          <div className="min-w-0 flex-1 px-2">
            <ProjectSwitcherTrigger project={project} onClick={() => setSheetOpen(true)} />
          </div>
        ) : (
          <div className="flex-1 px-1">
            <Wordmark size={19} />
          </div>
        )}
        <IconButton label={t('search.open')} icon={<Icons.search />} size="touch" variant="ghost" onClick={() => openSearch(true)} />
      </TopBar>

      <div className="lg:pl-sidebar">
        <PaymentPendingNotice />
        <main id="conteudo" tabIndex={-1} className="outline-none">
          <Outlet />
        </main>
        {onProjectPage && <TabBarSpacer />}
      </div>

      {onProjectPage && (
        <>
          <TabBar label={t('projectNav')}>
            {MOBILE_TABS.map(({ key, icon }) => (
              <li key={key}>
                <NavLink to={`/projects/${project.id}/${key}`} className={({ isActive }) => tabBarItemClass(isActive)}>
                  <TabBarItemContent icon={icon} label={t(`sections.${key}`)} />
                </NavLink>
              </li>
            ))}
          </TabBar>
          <ProjectSwitcherSheet open={sheetOpen} onOpenChange={setSheetOpen} currentId={project.id} />
        </>
      )}
      <GlobalSearch />
    </div>
  )
}

/** Story 12.13: the active organization's payment is pending (access unchanged). */
function PaymentPendingNotice() {
  const { t } = useTranslation('nav')
  const { active } = useActiveOrganization()
  if (active?.status !== 'payment_pending') return null
  return (
    <div className="mx-auto max-w-content px-4 pt-4 md:px-10">
      <Banner tone="warning">{t('paymentPending', { organization: active.name })}</Banner>
    </div>
  )
}
