import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from 'react-query'
import i18n from '../../i18n'
import ProjectSharing from '../../components/organisms/ProjectSharing'
import type { ProjectOrganization } from '../../hooks/useProjectOrganizations'

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import api from '../../services/api'

const mockedApi = vi.mocked(api)

const owner: ProjectOrganization = {
  organization_id: 'org-soubim',
  name: 'souBIM',
  slug: 'soubim',
  access: 'owner',
  invited_by: null,
  created_at: null,
}
const dimas: ProjectOrganization = {
  organization_id: 'org-dimas',
  name: 'DIMAS',
  slug: 'dimas',
  access: 'viewer',
  invited_by: 'user-1',
  created_at: '2026-10-06T10:00:00Z',
}

function renderSharing() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ProjectSharing projectId="p1" />
    </QueryClientProvider>
  )
}

function listReturns(organizations: ProjectOrganization[]) {
  mockedApi.get.mockResolvedValue({ data: { organizations } })
}

describe('ProjectSharing (Story 12.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists the owner and shared organizations', async () => {
    listReturns([owner, dimas])
    renderSharing()
    expect(await screen.findByText('Organizations with access')).toBeInTheDocument()
    expect(mockedApi.get).toHaveBeenCalledWith('/projects/p1/organizations')
    expect(screen.getByText('souBIM')).toBeInTheDocument()
    expect(screen.getByText('Owner')).toBeInTheDocument()
    expect(screen.getByLabelText('Access for DIMAS')).toHaveValue('viewer')
    // the owner cannot be changed or removed
    expect(screen.queryByLabelText('Access for souBIM')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Remove souBIM')).not.toBeInTheDocument()
  })

  it('renders nothing when the user cannot manage shares', async () => {
    mockedApi.get.mockRejectedValue({ response: { status: 403 } })
    const { container } = renderSharing()
    await waitFor(() => expect(mockedApi.get).toHaveBeenCalled())
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('invites an organization by identifier', async () => {
    listReturns([owner])
    mockedApi.post.mockResolvedValue({ data: { ...dimas, access: 'contributor' } })
    renderSharing()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Organization identifier'), ' dimas ')
    await user.selectOptions(screen.getByLabelText('Access level'), 'contributor')
    await user.click(screen.getByRole('button', { name: 'Invite' }))
    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith('/projects/p1/organizations', {
        organization_slug: 'dimas',
        access: 'contributor',
      })
    )
    expect(mockedApi.get).toHaveBeenCalledTimes(2) // list refreshed
  })

  it('shows an error when the organization does not exist', async () => {
    listReturns([owner])
    mockedApi.post.mockRejectedValue({ response: { status: 404 } })
    renderSharing()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Organization identifier'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Invite' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No organization with this identifier.')
  })

  it('changes access and removes an organization', async () => {
    listReturns([owner, dimas])
    mockedApi.patch.mockResolvedValue({ data: { ...dimas, access: 'contributor' } })
    mockedApi.delete.mockResolvedValue({ data: {} })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderSharing()
    const user = userEvent.setup()
    await user.selectOptions(await screen.findByLabelText('Access for DIMAS'), 'contributor')
    expect(mockedApi.patch).toHaveBeenCalledWith('/projects/p1/organizations/org-dimas', { access: 'contributor' })
    await user.click(screen.getByLabelText('Remove DIMAS'))
    expect(confirm).toHaveBeenCalled()
    await waitFor(() => expect(mockedApi.delete).toHaveBeenCalledWith('/projects/p1/organizations/org-dimas'))
    confirm.mockRestore()
  })

  describe('in Portuguese', () => {
    afterEach(() => i18n.changeLanguage('en'))

    it('uses the pt-BR section title', async () => {
      await i18n.changeLanguage('pt-BR')
      listReturns([owner, dimas])
      renderSharing()
      expect(await screen.findByText('Organizações com acesso')).toBeInTheDocument()
      expect(screen.getByText('Proprietária')).toBeInTheDocument()
    })
  })
})
