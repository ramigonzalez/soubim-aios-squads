import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import i18n from '../../i18n'
import api from '../../services/api'
import { GoogleSignInButton } from '../../components/organisms/GoogleSignInButton'
import GoogleCallback from '../../pages/GoogleCallback'
import { Login } from '../../pages/Login'
import { PENDING_GOOGLE_LOGIN_KEY, savePendingGoogleLogin } from '../../services/googleAuthService'
import { useAuthStore } from '../../store/authStore'
import { useOrganizationStore } from '../../store/organizationStore'

function providers(google: boolean) {
  return vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/auth/providers') return { data: { password: true, google } }
    throw new Error(`unexpected GET ${url}`)
  })
}

function Where() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

const tokenResponse = (over = {}) => ({
  data: {
    access_token: 'jwt',
    token_type: 'bearer',
    user: { id: 'u1', email: 'owner@acme.com', name: 'Owner', role: 'client' },
    organization_id: null,
    ...over,
  },
})

function renderCallback(hash: string) {
  window.history.replaceState(null, '', `/auth/google/callback${hash}`)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/auth/google/callback']}>
        <Routes>
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Sign in with Google (Story 12.8)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    useAuthStore.getState().clearAuth()
    useOrganizationStore.setState({ activeOrganizationId: null })
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  describe('GoogleSignInButton', () => {
    it('is hidden when the server has Google sign-in disabled', async () => {
      const get = providers(false)
      render(<GoogleSignInButton />)
      await waitFor(() => expect(get).toHaveBeenCalledWith('/auth/providers'))
      expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument()
    })

    it('is hidden when the providers call fails', async () => {
      const get = vi.spyOn(api, 'get').mockRejectedValue(new Error('network'))
      render(<GoogleSignInButton />)
      await waitFor(() => expect(get).toHaveBeenCalled())
      expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument()
    })

    it('starts the flow: keeps the browser key in this tab and goes to Google', async () => {
      providers(true)
      const post = vi.spyOn(api, 'post').mockResolvedValue({
        data: { url: 'https://accounts.google.com/o/oauth2/v2/auth?x=1', browser_key: 'bk-1' },
      })
      const assign = vi.fn()
      const original = window.location
      Object.defineProperty(window, 'location', { configurable: true, value: { ...original, assign } })
      try {
        render(<GoogleSignInButton redirect="/projects/p1" />)
        await userEvent.click(await screen.findByRole('button', { name: 'Sign in with Google' }))
        await waitFor(() => expect(assign).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/v2/auth?x=1'))
        expect(post).toHaveBeenCalledWith('/auth/google/start', {})
        expect(JSON.parse(sessionStorage.getItem(PENDING_GOOGLE_LOGIN_KEY)!)).toEqual({
          browserKey: 'bk-1',
          redirect: '/projects/p1',
        })
      } finally {
        Object.defineProperty(window, 'location', { configurable: true, value: original })
      }
    })

    it('sends the invitation token when accepting an invitation', async () => {
      providers(true)
      const post = vi.spyOn(api, 'post').mockRejectedValue(new Error('down'))
      render(<GoogleSignInButton labelKey="google.continue" invitationToken="tok123" />)
      await userEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }))
      expect(post).toHaveBeenCalledWith('/auth/google/start', { invitation_token: 'tok123' })
      expect(await screen.findByRole('alert')).toHaveTextContent('Could not start Google sign-in')
    })

    it('is labelled in Portuguese by default', async () => {
      providers(true)
      await i18n.changeLanguage('pt-BR')
      try {
        render(<GoogleSignInButton />)
        expect(await screen.findByRole('button', { name: 'Entrar com Google' })).toBeInTheDocument()
      } finally {
        await i18n.changeLanguage('en')
      }
    })
  })

  it('Login page shows the Google button when enabled', async () => {
    providers(true)
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>
    )
    expect(await screen.findByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument()
  })

  describe('GoogleCallback', () => {
    it('redeems the one-time code with the browser key, logs in and follows the safe redirect', async () => {
      savePendingGoogleLogin({ browserKey: 'bk-1', redirect: '/invite/abc' })
      const post = vi.spyOn(api, 'post').mockResolvedValue(tokenResponse())
      renderCallback('#code=one-time-code')

      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/invite/abc'))
      expect(post).toHaveBeenCalledWith('/auth/google/exchange', { code: 'one-time-code', browser_key: 'bk-1' })
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(window.location.hash).toBe('') // the code left the address bar
      expect(sessionStorage.getItem(PENDING_GOOGLE_LOGIN_KEY)).toBeNull()
    })

    it('never follows an unsafe redirect', async () => {
      savePendingGoogleLogin({ browserKey: 'bk-1', redirect: '//evil.example.com' })
      vi.spyOn(api, 'post').mockResolvedValue(tokenResponse())
      renderCallback('#code=c')
      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/projects'))
    })

    it('invitation accepted: activates the joined organization', async () => {
      savePendingGoogleLogin({ browserKey: 'bk-1', invitationToken: 'tok123' })
      vi.spyOn(api, 'post').mockResolvedValue(tokenResponse({ organization_id: 'org-9' }))
      renderCallback('#code=c')
      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/projects'))
      expect(useOrganizationStore.getState().activeOrganizationId).toBe('org-9')
    })

    it('shows the reason sent by the backend callback', async () => {
      savePendingGoogleLogin({ browserKey: 'bk-1' })
      const post = vi.spyOn(api, 'post')
      renderCallback('#error=email_unverified')
      expect(await screen.findByRole('alert')).toHaveTextContent('Your Google email is not verified')
      expect(post).not.toHaveBeenCalled()
      expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute('href', '/login')
    })

    it('unknown email: friendly message, not logged in', async () => {
      savePendingGoogleLogin({ browserKey: 'bk-1' })
      vi.spyOn(api, 'post').mockRejectedValue({ response: { status: 403, data: { detail: 'unknown_email' } } })
      renderCallback('#code=c')
      expect(await screen.findByRole('alert')).toHaveTextContent('There is no DecisionLog account for this Google email')
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('invitation for another email: back to the invitation', async () => {
      savePendingGoogleLogin({ browserKey: 'bk-1', invitationToken: 'tok123' })
      vi.spyOn(api, 'post').mockRejectedValue({ response: { status: 403, data: { detail: 'email_mismatch' } } })
      renderCallback('#code=c')
      expect(await screen.findByRole('alert')).toHaveTextContent('This invitation was sent to another email')
      expect(screen.getByRole('link', { name: 'Back to the invitation' })).toHaveAttribute('href', '/invite/tok123')
    })

    it('a code without the browser key of this tab is not redeemed', async () => {
      const post = vi.spyOn(api, 'post')
      renderCallback('#code=c')
      expect(await screen.findByRole('alert')).toHaveTextContent('started in another browser or tab')
      expect(post).not.toHaveBeenCalled()
    })

    it('unknown reasons fall back to a generic message', async () => {
      renderCallback('#error=something_new')
      expect(await screen.findByRole('alert')).toHaveTextContent('Google sign-in failed')
    })
  })
})
