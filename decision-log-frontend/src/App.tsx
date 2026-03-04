import React, { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Login } from './pages/Login'
import { Projects } from './pages/Projects'
import { ProjectDetail } from './pages/ProjectDetail'
import { SharedMilestoneTimeline } from './pages/SharedMilestoneTimeline'
import Ingestion from './pages/Ingestion'
import { Navigation } from './components/common/Navigation'
import { useAuthStore } from './store/authStore'

const ProjectCreate = lazy(() => import('./pages/ProjectCreate'))
const ProjectEdit = lazy(() => import('./pages/ProjectEdit'))

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <>
      {isAuthenticated && <Navigation />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/shared/milestones/:token" element={<SharedMilestoneTimeline />} />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/new"
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="flex justify-center py-16">Loading...</div>}>
                <ProjectCreate />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id/edit"
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="flex justify-center py-16">Loading...</div>}>
                <ProjectEdit />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <ProjectDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ingestion"
          element={
            <ProtectedRoute>
              <Ingestion />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/projects" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  // Initialize auth state from localStorage on app startup
  useEffect(() => {
    useAuthStore.getState().initializeFromStorage()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppRoutes />
      </Router>
    </QueryClientProvider>
  )
}
