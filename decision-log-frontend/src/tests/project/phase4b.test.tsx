/**
 * Promem revamp Phase 4b: Entrar, the 404 page and the login's 401 handling (pt-BR).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { AxiosError } from 'axios'
import api from '../../services/api'
import { Login } from '../../pages/Login'
import NotFound from '../../pages/NotFound'
import { useAuthStore } from '../../store/authStore'
import { usePortuguese } from '../design-system/render'

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname}</p>
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}

function providers(google: boolean) {
  return vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/auth/providers') return { data: { password: true, google } }
    throw new Error(`unexpected GET ${url}`)
  })
}

describe('Phase 4b · Entrar', () => {
  usePortuguese()
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    useAuthStore.getState().clearAuth()
  })

  it('leads with Google when the server has it, e-mail second, no demo hints', async () => {
    providers(true)
    renderLogin()
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /promem/i })).toBeInTheDocument()
    const google = await screen.findByRole('button', { name: 'Entrar com Google' })
    const buttons = screen.getAllByRole('button').map((b) => b.textContent)
    expect(buttons.indexOf('Entrar com Google')).toBeLessThan(buttons.indexOf('Entrar'))
    expect(google).toBeInTheDocument()
    expect(screen.getByText('ou entre com e-mail')).toBeInTheDocument()
    expect(screen.queryByText(/demonstração/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/"password"/)).not.toBeInTheDocument()
  })

  it('without Google, e-mail and senha is the primary path', async () => {
    providers(false)
    renderLogin()
    expect(await screen.findByText('Entre com o e-mail e a senha da sua conta.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entrar com Google' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
  })

  it('a wrong password shows a pt-BR message and stays on the page', async () => {
    providers(false)
    vi.spyOn(api, 'post').mockRejectedValue({ response: { status: 401, data: { detail: 'Invalid email or password' } } })
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText('E-mail'), 'gabriela@soubim.com')
    await user.type(screen.getByLabelText('Senha'), 'errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
  })

  it('signs in and opens the projects', async () => {
    providers(false)
    vi.spyOn(api, 'post').mockResolvedValue({ data: { access_token: 'jwt', user: { id: 'u', email: 'g@x.com', name: 'G', role: 'client' } } })
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText('E-mail'), 'g@x.com')
    await user.type(screen.getByLabelText('Senha'), 'password')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByTestId('where')).toHaveTextContent('/projects')
  })
})

describe('Phase 4b · 401 on the login itself', () => {
  const original = window.location
  afterEach(() => {
    Object.defineProperty(window, 'location', { value: original, writable: true })
  })

  it('does not reload the login page (the message would be lost); other 401s still end the session', async () => {
    const location = { href: 'http://localhost/login' }
    Object.defineProperty(window, 'location', { value: location, writable: true })
    const handlers = (api.interceptors.response as unknown as { handlers: { rejected: (e: AxiosError) => Promise<unknown> }[] }).handlers
    const rejected = handlers[handlers.length - 1].rejected
    const error = (url: string) => ({ config: { url }, response: { status: 401, data: {} } }) as unknown as AxiosError

    await expect(rejected(error('/auth/login'))).rejects.toBeTruthy()
    expect(location.href).toBe('http://localhost/login')

    localStorage.setItem('access_token', 'jwt')
    await expect(rejected(error('/projects'))).rejects.toBeTruthy()
    expect(location.href).toBe('/login')
    expect(localStorage.getItem('access_token')).toBeNull()
  })
})

describe('Phase 4b · 404', () => {
  usePortuguese()
  it('says what happened and offers one way on', () => {
    useAuthStore.setState({ isAuthenticated: true })
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para os projetos' })).toHaveAttribute('href', '/projects')
  })

  it('signed out, it points to Entrar', () => {
    useAuthStore.setState({ isAuthenticated: false })
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
  })
})
