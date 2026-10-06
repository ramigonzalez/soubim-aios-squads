import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import TeamSettings from '../../pages/TeamSettings'
import { useAuthStore } from '../../store/authStore'
import { useOrganizationStore } from '../../store/organizationStore'
import api from '../../services/api'

const MEMBERS = [
  { user_id: 'u1', name: 'Ana Owner', email: 'ana@x.com', role: 'owner', joined_at: '2026-01-01T00:00:00Z' },
  { user_id: 'u2', name: 'Bia Member', email: 'bia@x.com', role: 'member', joined_at: '2026-01-02T00:00:00Z' },
]

// Story 12.7: projects of the organization (owned + shared with it) and who is assigned
const ASSIGNMENTS = {
  projects: [
    { id: 'p1', name: 'Torre Norte', owned: true },
    { id: 'p2', name: 'Partner Tower', owned: false },
  ],
  assignments: [{ user_id: 'u2', project_id: 'p1' }],
}

function setup(role: 'owner' | 'admin' | 'member', slug = 'acme') {
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/organizations/me') return { data: [{ id: 'org-1', name: 'Acme', slug, role }] }
    if (url.endsWith('/members')) return { data: { members: MEMBERS } }
    if (url.endsWith('/project-assignments')) return { data: ASSIGNMENTS }
    if (url.endsWith('/invitations')) return { data: { invitations: [] } }
    return { data: {} }
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TeamSettings />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('TeamSettings (Story 12.5)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    useOrganizationStore.setState({ activeOrganizationId: null })
    useAuthStore.getState().setAuth({ id: 'u1', email: 'ana@x.com', name: 'Ana', role: 'client' }, 'jwt')
  })

  it('members get a notice and no data requests', async () => {
    setup('member')
    expect(await screen.findByText(/Only owners and admins/)).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalledWith('/organizations/org-1/members')
  })

  it('lists members, cannot remove yourself, and creates an invitation showing the link once', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: { id: 'i1', email: 'new@x.com', role: 'member', invite_url: 'http://app/invite/abc' },
    })
    setup('owner')
    expect(await screen.findByText('Bia Member')).toBeInTheDocument()
    const removeButtons = screen.getAllByRole('button', { name: 'Remove' })
    expect(removeButtons[0]).toBeDisabled() // yourself
    expect(removeButtons[1]).toBeEnabled()

    await userEvent.type(screen.getByLabelText('Email'), 'new@x.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
    expect(await screen.findByDisplayValue('http://app/invite/abc')).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/invitations', { email: 'new@x.com', role: 'member', organization_id: 'org-1' })
  })

  it('an admin cannot grant the owner role', async () => {
    setup('admin')
    await screen.findByText('Bia Member')
    const roleSelect = screen.getByLabelText('Role')
    expect(roleSelect.querySelector('option[value="owner"]')).toBeNull()
  })

  it('reviewer is a role admins can invite and grant (Story 12.7)', async () => {
    setup('admin')
    await screen.findByText('Bia Member')
    expect(screen.getByLabelText('Role').querySelector('option[value="reviewer"]')).not.toBeNull()
    expect(screen.getByLabelText('Role Bia Member').querySelector('option[value="reviewer"]')).not.toBeNull()
  })

  it('assigns and unassigns a member to projects of the organization (Story 12.7)', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: {} })
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: {} })
    setup('admin')
    // owners/admins reach every project: nothing to assign
    expect(await screen.findByText('Access to every project of the organization')).toBeInTheDocument()

    await userEvent.click(await screen.findByRole('button', { name: 'Assigned projects: 1' }))
    const assigned = screen.getByRole('checkbox', { name: 'Torre Norte' })
    const shared = screen.getByRole('checkbox', { name: /Partner Tower/ })
    expect(assigned).toBeChecked()
    expect(shared).not.toBeChecked()
    expect(screen.getByText('(shared)')).toBeInTheDocument()

    await userEvent.click(shared)
    expect(put).toHaveBeenCalledWith('/organizations/org-1/members/u2/projects/p2')
    await userEvent.click(assigned)
    expect(del).toHaveBeenCalledWith('/organizations/org-1/members/u2/projects/p1')
  })

  it('only the platform organization can invite a new company', async () => {
    setup('admin', 'acme')
    await screen.findByText('Bia Member')
    expect(screen.queryByLabelText(/company that is not on DecisionLog/)).not.toBeInTheDocument()
  })

  it('platform admin invites a company: sends the name, not the organization id', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 'i', email: 'c@x.com', role: 'owner', invite_url: 'http://app/invite/z' } })
    setup('admin', 'soubim')
    await userEvent.click(await screen.findByLabelText(/company that is not on DecisionLog/))
    await userEvent.type(screen.getByLabelText('Company name'), 'NewCo')
    await userEvent.type(screen.getByLabelText('Email'), 'c@x.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
    await screen.findByDisplayValue('http://app/invite/z')
    expect(post).toHaveBeenCalledWith('/invitations', { email: 'c@x.com', role: 'member', organization_name: 'NewCo' })
  })
})
