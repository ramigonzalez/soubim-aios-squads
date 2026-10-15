import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

/** Story 12.13: where a user lands after login (or on `/`): the operator on /platform, everyone else on /projects. */
export function homePath(user: { is_platform_operator?: boolean } | null | undefined): string {
  return user?.is_platform_operator ? '/platform' : '/projects'
}

/**
 * Story 12.13: only the platform operator opens /platform. Everyone else is sent to their projects
 * (the backend answers 403 to every `/api/platform/*` call anyway).
 */
export function PlatformRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const isOperator = useAuthStore(s => Boolean(s.user?.is_platform_operator))

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isOperator) return <Navigate to="/projects" replace />
  return <>{children}</>
}

/** `/`: the user's home (Story 12.13). */
export function HomeRedirect() {
  const user = useAuthStore(s => s.user)
  return <Navigate to={homePath(user)} replace />
}
