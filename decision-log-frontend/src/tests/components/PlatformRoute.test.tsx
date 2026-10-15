import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { HomeRedirect, PlatformRoute, homePath } from '../../components/common/PlatformRoute'
import { Navigation } from '../../components/common/Navigation'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import type { User } from '../../types/auth'

const MEMBER: User = { id: 'u1', email: 'ana@x.com', name: 'Ana', role: 'client' }
const OPERATOR: User = { ...MEMBER, id: 'op', email: 'op@x.com', is_platform_operator: true }

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/projects" element={<p>projects page</p>} />
        <Route
          path="/platform"
          element={
            <PlatformRoute>
              <p>platform page</p>
            </PlatformRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('PlatformRoute (Story 12.13)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useAuthStore.getState().clearAuth()
  })

  it('sends logged-out visitors to the login page', () => {
    renderAt('/platform')
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('sends organization users (admins included) to their projects', () => {
    useAuthStore.getState().setAuth(MEMBER, 'jwt')
    renderAt('/platform')
    expect(screen.getByText('projects page')).toBeInTheDocument()
    expect(screen.queryByText('platform page')).not.toBeInTheDocument()
  })

  it('opens for the platform operator', () => {
    useAuthStore.getState().setAuth(OPERATOR, 'jwt')
    renderAt('/platform')
    expect(screen.getByText('platform page')).toBeInTheDocument()
    expect(homePath(OPERATOR)).toBe('/platform')
    expect(homePath(MEMBER)).toBe('/projects')
  })

  it('/ is the platform page for the operator and the projects for everyone else', () => {
    useAuthStore.getState().setAuth(OPERATOR, 'jwt')
    const { unmount } = renderAt('/')
    expect(screen.getByText('platform page')).toBeInTheDocument()
    unmount()

    useAuthStore.getState().setAuth(MEMBER, 'jwt')
    renderAt('/')
    expect(screen.getByText('projects page')).toBeInTheDocument()
  })
})

describe('Navigation link to the platform page (Story 12.13)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    vi.spyOn(api, 'get').mockResolvedValue({ data: [] })
  })

  function renderNavigation() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Navigation />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('is shown to the operator only', () => {
    useAuthStore.getState().setAuth(OPERATOR, 'jwt')
    const { unmount } = renderNavigation()
    expect(screen.getByRole('link', { name: 'Platform' })).toHaveAttribute('href', '/platform')
    unmount()

    useAuthStore.getState().setAuth(MEMBER, 'jwt')
    renderNavigation()
    expect(screen.queryByRole('link', { name: 'Platform' })).not.toBeInTheDocument()
  })
})
