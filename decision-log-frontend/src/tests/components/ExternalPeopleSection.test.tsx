import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from 'react-query'
import i18n from '../../i18n'
import ExternalPeopleSection from '../../components/organisms/ExternalPeopleSection'
import type { ProjectExternals } from '../../hooks/useProjectExternals'

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

const data: ProjectExternals = {
  externals: [
    { user_id: 'u-guest', name: 'Gina Guest', email: 'gina@client.com', access: 'viewer', joined_at: '2026-10-15T10:00:00Z' },
  ],
  invitations: [
    { id: 'i-1', email: 'pending@client.com', status: 'pending', expires_at: '2026-10-22T10:00:00Z', created_at: '2026-10-15T10:00:00Z' },
    { id: 'i-2', email: 'no@client.com', status: 'rejected', expires_at: '2026-10-22T10:00:00Z', created_at: '2026-10-14T10:00:00Z' },
  ],
}

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ExternalPeopleSection projectId="p1" />
    </QueryClientProvider>
  )
}

describe('ExternalPeopleSection (Story 12.15)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedApi.get.mockResolvedValue({ data })
  })

  it('lists external people with the badge, pending and rejected invitations, and says it saves automatically', async () => {
    renderSection()
    expect(await screen.findByText('External people')).toBeInTheDocument()
    expect(mockedApi.get).toHaveBeenCalledWith('/projects/p1/externals')
    expect(screen.getByText('Saved automatically')).toBeInTheDocument()
    expect(screen.getByText('Gina Guest')).toBeInTheDocument()
    expect(screen.getByTestId('external-badge')).toHaveTextContent('External')
    expect(screen.getByLabelText('Access of Gina Guest')).toHaveValue('viewer')
    expect(screen.getByText('pending@client.com')).toBeInTheDocument()
    expect(screen.getByText('Invitation pending')).toBeInTheDocument()
    expect(screen.getByText('Declined')).toBeInTheDocument()
  })

  it('renders nothing on 403 (not an admin of the owning organization)', async () => {
    mockedApi.get.mockRejectedValue({ response: { status: 403 } })
    const { container } = renderSection()
    await waitFor(() => expect(mockedApi.get).toHaveBeenCalled())
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('invites by e-mail and shows the link to copy', async () => {
    mockedApi.post.mockResolvedValue({
      data: { id: 'i-3', email: 'new@client.com', status: 'pending', expires_at: '', created_at: '', invite_url: 'http://app/invite/tok' },
    })
    renderSection()
    await userEvent.type(await screen.findByLabelText("Person's e-mail"), 'new@client.com')
    await userEvent.click(screen.getByRole('button', { name: 'Invite' }))
    expect(mockedApi.post).toHaveBeenCalledWith('/projects/p1/externals/invitations', { email: 'new@client.com' })
    expect(await screen.findByLabelText('Invitation link')).toHaveValue('http://app/invite/tok')
    expect(screen.getByRole('status')).toHaveTextContent('new@client.com')
  })

  it.each([
    ['already_member', 'This person is already a member of the organization.'],
    ['already_invited', 'This person already has external access to this project.'],
  ])('shows a message for 409 %s', async (detail, message) => {
    mockedApi.post.mockRejectedValue({ response: { status: 409, data: { detail } } })
    renderSection()
    await userEvent.type(await screen.findByLabelText("Person's e-mail"), 'x@client.com')
    await userEvent.click(screen.getByRole('button', { name: 'Invite' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('changes access, removes a person and revokes an invitation', async () => {
    mockedApi.patch.mockResolvedValue({ data: {} })
    mockedApi.delete.mockResolvedValue({ data: {} })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderSection()
    await userEvent.selectOptions(await screen.findByLabelText('Access of Gina Guest'), 'contributor')
    expect(mockedApi.patch).toHaveBeenCalledWith('/projects/p1/externals/u-guest', { access: 'contributor' })
    await userEvent.click(screen.getByRole('button', { name: 'Remove Gina Guest' }))
    expect(mockedApi.delete).toHaveBeenCalledWith('/projects/p1/externals/u-guest')
    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }))
    expect(mockedApi.delete).toHaveBeenCalledWith('/projects/p1/externals/invitations/i-1')
  })

  it('is translated to Portuguese', async () => {
    await i18n.changeLanguage('pt-BR')
    try {
      renderSection()
      expect(await screen.findByText('Pessoas externas')).toBeInTheDocument()
      expect(screen.getByText('Salvo automaticamente')).toBeInTheDocument()
      expect(screen.getByText('Recusado')).toBeInTheDocument()
      expect(screen.getByTestId('external-badge')).toHaveTextContent('Externo')
    } finally {
      await i18n.changeLanguage('en')
    }
  })
})
