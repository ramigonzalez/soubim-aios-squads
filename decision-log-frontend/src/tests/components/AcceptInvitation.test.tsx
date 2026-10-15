import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import AcceptInvitation from '../../pages/AcceptInvitation'
import { useAuthStore } from '../../store/authStore'
import { useOrganizationStore } from '../../store/organizationStore'
import api from '../../services/api'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/invite/tok123']}>
        <Routes>
          <Route path="/invite/:token" element={<AcceptInvitation />} />
          <Route path="/projects" element={<div>projects page</div>} />
          <Route path="/projects/:id" element={<div>project page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const preview = (over = {}) => ({
  data: { organization_name: 'Acme', email: 'new@x.com', role: 'member', account_exists: false, ...over },
})

describe('AcceptInvitation (Story 12.5)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Story 12.8: Google sign-in disabled unless a test enables it
    vi.spyOn(api, 'get').mockResolvedValue({ data: { password: true, google: false } })
    localStorage.clear()
    useAuthStore.getState().clearAuth()
    useOrganizationStore.setState({ activeOrganizationId: null })
  })

  it('new user: sets name and password, is logged in and lands on the projects', async () => {
    const post = vi.spyOn(api, 'post').mockImplementation(async (url: string) => {
      if (url === '/invitations/public/preview') return preview()
      return {
        data: { access_token: 'jwt', token_type: 'bearer', user: { id: 'u', email: 'new@x.com', name: 'New', role: 'client' } },
      }
    })
    renderPage()
    expect(await screen.findByText('Join Acme')).toBeInTheDocument()

    await userEvent.type(screen.getByPlaceholderText('Your name'), 'New Person')
    await userEvent.type(screen.getByPlaceholderText(/Password/), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Create account and join' }))

    expect(await screen.findByText('projects page')).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/invitations/public/accept', {
      token: 'tok123', name: 'New Person', password: 'password123',
    })
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('existing user not logged in is sent to log in and come back', async () => {
    vi.spyOn(api, 'post').mockResolvedValue(preview({ account_exists: true }))
    renderPage()
    const link = await screen.findByRole('link', { name: 'Log in' })
    expect(link).toHaveAttribute('href', '/login?redirect=%2Finvite%2Ftok123')
    expect(screen.queryByPlaceholderText('Your name')).not.toBeInTheDocument()
  })

  it('existing user with the invited email accepts and the organization becomes active', async () => {
    useAuthStore.getState().setAuth({ id: 'u', email: 'NEW@x.com', name: 'N', role: 'client' }, 'jwt')
    vi.spyOn(api, 'post').mockImplementation(async (url: string) => {
      if (url === '/invitations/public/preview') return preview({ account_exists: true })
      return { data: { id: 'org-acme', name: 'Acme', slug: 'acme' } }
    })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }))
    expect(await screen.findByText('projects page')).toBeInTheDocument()
    expect(useOrganizationStore.getState().activeOrganizationId).toBe('org-acme')
  })

  it('logged in with another email: explains and offers logout, no accept button', async () => {
    useAuthStore.getState().setAuth({ id: 'u', email: 'other@x.com', name: 'O', role: 'client' }, 'jwt')
    vi.spyOn(api, 'post').mockResolvedValue(preview({ account_exists: true }))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('other@x.com')
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false))
  })

  it.each([
    [410, /already been used, revoked or has expired/],
    [404, /does not exist/],
  ])('shows a message for a %s invitation', async (status, message) => {
    vi.spyOn(api, 'post').mockRejectedValue({ response: { status } })
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('offers "Continue with Google" when the server has it enabled (Story 12.8)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { password: true, google: true } })
    vi.spyOn(api, 'post').mockResolvedValue(preview())
    renderPage()
    expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
  })

  it('no Google button once logged in with an existing account (Story 12.8)', async () => {
    useAuthStore.getState().setAuth({ id: 'u', email: 'new@x.com', name: 'N', role: 'client' }, 'jwt')
    vi.spyOn(api, 'get').mockResolvedValue({ data: { password: true, google: true } })
    vi.spyOn(api, 'post').mockResolvedValue(preview({ account_exists: true }))
    renderPage()
    expect(await screen.findByRole('button', { name: 'Accept invitation' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument()
  })

  it.each([
    ['organization_blocked', 'This organization is suspended. Contact the person who invited you.'],
    ['operator_cannot_join', 'The platform operator account cannot join organizations.'],
  ])('Story 12.13: a refused accept (%s) shows a translated message', async (detail, message) => {
    vi.spyOn(api, 'post').mockImplementation(async (url: string) => {
      if (url === '/invitations/public/preview') return preview()
      throw { response: { status: 403, data: { detail } } }
    })
    renderPage()
    await userEvent.type(await screen.findByPlaceholderText('Your name'), 'New Person')
    await userEvent.type(screen.getByPlaceholderText(/Password/), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Create account and join' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  describe('project invitation (Story 12.15)', () => {
    const projectPreview = (over = {}) =>
      preview({ role: 'external', project_id: 'p-x', project_name: 'Project X', ...over })

    it('shows "Acme invites you to project X"; a new user signs up (no organization) and lands on the project', async () => {
      const post = vi.spyOn(api, 'post').mockImplementation(async (url: string) => {
        if (url === '/invitations/public/preview') return projectPreview()
        return {
          data: { access_token: 'jwt', token_type: 'bearer', user: { id: 'u', email: 'new@x.com', name: 'New', role: 'client' } },
        }
      })
      renderPage()
      expect(await screen.findByText('Acme invites you to the project Project X')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Decline invitation' })).toBeInTheDocument()
      await userEvent.type(screen.getByPlaceholderText('Your name'), 'New Person')
      await userEvent.type(screen.getByPlaceholderText(/Password/), 'password123')
      await userEvent.click(screen.getByRole('button', { name: 'Create account and join' }))
      expect(await screen.findByText('project page')).toBeInTheDocument()
      expect(post).toHaveBeenCalledWith('/invitations/public/accept', {
        token: 'tok123', name: 'New Person', password: 'password123',
      })
    })

    it('existing user accepts and opens the project', async () => {
      useAuthStore.getState().setAuth({ id: 'u', email: 'new@x.com', name: 'N', role: 'client' }, 'jwt')
      vi.spyOn(api, 'post').mockImplementation(async (url: string) => {
        if (url === '/invitations/public/preview') return projectPreview({ account_exists: true })
        return { data: { id: 'org-acme', name: 'Acme', slug: 'acme', project_id: 'p-x' } }
      })
      renderPage()
      await userEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }))
      expect(await screen.findByText('project page')).toBeInTheDocument()
      expect(useOrganizationStore.getState().activeOrganizationId).toBe('org-acme')
    })

    it('rejects without an account', async () => {
      const post = vi.spyOn(api, 'post').mockImplementation(async (url: string) => {
        if (url === '/invitations/public/preview') return projectPreview()
        return { data: { status: 'rejected' } }
      })
      renderPage()
      await userEvent.click(await screen.findByRole('button', { name: 'Decline invitation' }))
      expect(await screen.findByRole('status')).toHaveTextContent('Invitation declined')
      expect(post).toHaveBeenCalledWith('/invitations/public/reject', { token: 'tok123' })
    })

    it('organization invitations cannot be declined', async () => {
      vi.spyOn(api, 'post').mockResolvedValue(preview())
      renderPage()
      expect(await screen.findByText('Join Acme')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Decline invitation' })).not.toBeInTheDocument()
    })

    it('a member of the organization gets a translated already_member message', async () => {
      useAuthStore.getState().setAuth({ id: 'u', email: 'new@x.com', name: 'N', role: 'client' }, 'jwt')
      vi.spyOn(api, 'post').mockImplementation(async (url: string) => {
        if (url === '/invitations/public/preview') return projectPreview({ account_exists: true })
        throw { response: { status: 409, data: { detail: 'already_member' } } }
      })
      renderPage()
      await userEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('You are already a member of this organization.')
    })
  })
})
