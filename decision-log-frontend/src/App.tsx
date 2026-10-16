import React, { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Login } from './pages/Login'
import { ProjectDetail } from './pages/ProjectDetail'
import Ingestion from './pages/Ingestion'
import { HomeRedirect, PlatformRoute } from './components/common/PlatformRoute'
import { LegacyMeetingRedirect, ProjectIndexRedirect } from './components/common/ProjectRedirects'
import { AppShell } from './components/templates/AppShell'
import { useAuthStore } from './store/authStore'
import { useTranslation } from 'react-i18next'
import { ToastProvider, TooltipProvider } from './design-system'

const ProjectFormPage = lazy(() => import('./pages/ProjectFormPage'))
const IntegrationsSettings = lazy(() => import('./pages/IntegrationsSettings'))
const FathomMeetings = lazy(() => import('./pages/FathomMeetings'))

const TeamSettings = lazy(() => import('./pages/TeamSettings'))
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'))
const GoogleCallback = lazy(() => import('./pages/GoogleCallback'))
const Platform = lazy(() => import('./pages/Platform'))
const ChangePassword = lazy(() => import('./pages/ChangePassword'))
const ProjectMore = lazy(() => import('./pages/ProjectMore'))
const ProjectOverview = lazy(() => import('./pages/ProjectOverview'))
const ProjectMilestones = lazy(() => import('./pages/ProjectMilestones'))
const ProjectHistory = lazy(() => import('./pages/ProjectHistory'))
const ManualItemNew = lazy(() => import('./pages/ManualItemNew'))
const ProjectMeetings = lazy(() => import('./pages/ProjectMeetings'))
const ProjectsList = lazy(() => import('./pages/ProjectsList'))
const PublicTimeline = lazy(() => import('./pages/PublicTimeline'))
const WorkspaceSettings = lazy(() => import('./pages/WorkspaceSettings'))
const ProjectApprovals = lazy(() => import('./pages/ProjectApprovals'))
const ProjectMeetingViewer = lazy(() => import('./pages/ProjectMeetingViewer'))
// Component gallery (Promem design system), development builds only
const UiGallery = import.meta.env.DEV ? lazy(() => import('./pages/dev/UiGallery')) : null

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    // Promem revamp: a deep link survives the login (Login validates the target with safeRedirect)
    const target = `${location.pathname}${location.search}${location.hash}`
    const redirect = target === '/' ? '' : `?redirect=${encodeURIComponent(target)}`
    return <Navigate to={`/login${redirect}`} replace />
  }

  return <>{children}</>
}

function Lazy({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('nav')
  return <Suspense fallback={<div className="flex justify-center py-16 text-small text-ink-2">{t('loading')}</div>}>{children}</Suspense>
}

/**
 * Promem revamp Phase 2: every signed-in page renders inside the AppShell (sidebar, drawer, mobile
 * bars). Public pages (login, invitations, shared timeline) render without it. Old URLs redirect.
 */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/shared/milestones/:token" element={<Lazy><PublicTimeline /></Lazy>} />
      <Route path="/m/:token" element={<Lazy><PublicTimeline /></Lazy>} />
      <Route path="/invite/:token" element={<Lazy><AcceptInvitation /></Lazy>} />
      <Route path="/auth/google/callback" element={<Lazy><GoogleCallback /></Lazy>} />
      {UiGallery && <Route path="/dev/ui" element={<Lazy><UiGallery /></Lazy>} />}

      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/projects" element={<Lazy><ProjectsList /></Lazy>} />
        <Route path="/projects/new" element={<Lazy><ProjectFormPage key="create" mode="create" /></Lazy>} />
        <Route path="/projects/:id" element={<ProjectIndexRedirect />} />
        <Route path="/projects/:id/edit" element={<Lazy><ProjectFormPage key="edit" mode="edit" /></Lazy>} />
        <Route path="/projects/:id/overview" element={<Lazy><ProjectOverview /></Lazy>} />
        <Route path="/projects/:id/milestones" element={<Lazy><ProjectMilestones /></Lazy>} />
        <Route path="/projects/:id/history" element={<Lazy><ProjectHistory /></Lazy>} />
        <Route path="/projects/:id/items/new" element={<Lazy><ManualItemNew /></Lazy>} />
        <Route path="/projects/:id/meetings" element={<Lazy><ProjectMeetings /></Lazy>} />
        <Route path="/projects/:id/meetings/:sourceId" element={<Lazy><ProjectMeetingViewer /></Lazy>} />
        <Route path="/projects/:id/summary" element={<ProjectDetail key="summary" view="digest" />} />
        <Route path="/projects/:id/more" element={<Lazy><ProjectMore /></Lazy>} />
        <Route path="/projects/:id/approvals" element={<Lazy><ProjectApprovals /></Lazy>} />
        <Route path="/meetings/:sourceId" element={<LegacyMeetingRedirect />} />
        <Route path="/ingestion" element={<Ingestion />} />
        <Route path="/settings/integrations" element={<Lazy><IntegrationsSettings /></Lazy>} />
        <Route path="/settings/integrations/fathom" element={<Lazy><FathomMeetings /></Lazy>} />
        <Route path="/settings/team" element={<Lazy><TeamSettings /></Lazy>} />
        <Route path="/settings/password" element={<Lazy><ChangePassword /></Lazy>} />
        <Route path="/settings/workspace" element={<Lazy><WorkspaceSettings /></Lazy>} />
        <Route path="/platform" element={<PlatformRoute><Lazy><Platform /></Lazy></PlatformRoute>} />
      </Route>

      <Route path="/" element={<HomeRedirect />} />
    </Routes>
  )
}

export default function App() {
  // Initialize auth state from localStorage on app startup
  useEffect(() => {
    useAuthStore.getState().initializeFromStorage()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ToastProvider>
          <Router>
            <AppRoutes />
          </Router>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
