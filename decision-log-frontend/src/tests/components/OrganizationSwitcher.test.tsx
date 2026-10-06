import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Navigation } from '../../components/common/Navigation'
import { useAuthStore } from '../../store/authStore'
import { ACTIVE_ORGANIZATION_KEY, useOrganizationStore } from '../../store/organizationStore'
import api from '../../services/api'

vi.mock('../../services/ingestionService', () => ({
  ingestionService: { getPendingCount: vi.fn().mockResolvedValue({ pending: 0 }) },
}))

const ORGS = [
  { id: 'org-1', name: 'souBIM', slug: 'soubim', role: 'admin' },
  { id: 'org-2', name: 'DIMAS', slug: 'dimas', role: 'member' },
]

function renderNav(orgs = ORGS) {
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/organizations/me') return { data: orgs }
    return { data: {} }
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Organization switcher (Story 12.5)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    useOrganizationStore.setState({ activeOrganizationId: null })
    useAuthStore.getState().setAuth(
      { id: 'u1', email: 'u@x.com', name: 'U', role: 'architect', projects: [] },
      'token'
    )
  })

  it('lets a user in two organizations switch and stores the choice', async () => {
    renderNav()
    const select = await screen.findByRole('combobox', { name: /organization/i })
    // defaults to the first organization
    await waitFor(() => expect(select).toHaveValue('org-1'))

    await userEvent.selectOptions(select, 'org-2')
    expect(useOrganizationStore.getState().activeOrganizationId).toBe('org-2')
    expect(localStorage.getItem(ACTIVE_ORGANIZATION_KEY)).toBe('org-2')
  })

  it('shows only the name for a single organization', async () => {
    renderNav([ORGS[0]])
    expect(await screen.findByText('souBIM')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('falls back to the first organization when the stored one is not a membership', async () => {
    useOrganizationStore.getState().setActiveOrganizationId('gone')
    renderNav()
    await waitFor(() => expect(useOrganizationStore.getState().activeOrganizationId).toBe('org-1'))
  })

  it('shows the Team link to owners/admins of the active organization only', async () => {
    renderNav()
    expect(await screen.findByRole('link', { name: 'Team' })).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /organization/i }), 'org-2')
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Team' })).not.toBeInTheDocument())
  })

  it('clears the active organization on logout', () => {
    useOrganizationStore.getState().setActiveOrganizationId('org-2')
    useAuthStore.getState().clearAuth()
    expect(useOrganizationStore.getState().activeOrganizationId).toBeNull()
    expect(localStorage.getItem(ACTIVE_ORGANIZATION_KEY)).toBeNull()
  })

  it('sends the active organization as X-Organization-Id', async () => {
    useOrganizationStore.getState().setActiveOrganizationId('org-2')
    const config = await (
      api.interceptors.request as unknown as {
        handlers: { fulfilled: (c: { headers: Record<string, string> }) => Promise<{ headers: Record<string, string> }> }[]
      }
    ).handlers[0].fulfilled({ headers: {} })
    expect(config.headers['X-Organization-Id']).toBe('org-2')
  })
})
