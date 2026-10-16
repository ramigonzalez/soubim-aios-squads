/**
 * Promem revamp Phase 4e: Notificações (pt-BR).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import * as apiModule from '../../services/api'
import { NotificationList, NotificationsButton } from '../../components/organisms/Notifications'
import { notificationHref, type AppNotification } from '../../hooks/useNotifications'
import { useAuthStore } from '../../store/authStore'
import { usePortuguese } from '../design-system/render'

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
const api = apiModule.default as unknown as Record<'get' | 'post', ReturnType<typeof vi.fn>>

const today = new Date().toISOString()
const NOTIFICATIONS: AppNotification[] = [
  { key: 'pending:s1', kind: 'pending_source', at: today, read: false, project: { id: 'p1', name: 'Residential Tower Alpha' }, source: { id: 's1', type: 'email', title: 'Prazo do granito' } },
  { key: 'extracted:s2:x', kind: 'extracted', at: today, read: false, count: 6, project: { id: 'p1', name: 'Residential Tower Alpha' }, source: { id: 's2', type: 'meeting', title: 'Coordenação MEP' } },
  { key: 'milestone:i1:x', kind: 'milestone', at: today, read: true, by: 'Carlos', project: { id: 'p2', name: 'Commercial Plaza Beta' }, item: { id: 'i1', type: 'decision', title: 'Concreto C50' } },
]

function Where() {
  const location = useLocation()
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>
}

function renderWith(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="*" element={<>{ui}<Where /></>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Phase 4e · Notificações', () => {
  usePortuguese()
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ isAuthenticated: true })
    api.get.mockResolvedValue({ data: { notifications: NOTIFICATIONS, unread: 2 } })
    api.post.mockImplementation((_url: string, body: { keys?: string[]; all?: boolean }) =>
      Promise.resolve({ data: { notifications: NOTIFICATIONS.map((n) => (body.all || body.keys?.includes(n.key) ? { ...n, read: true } : n)), unread: body.all ? 0 : 1 } }),
    )
  })

  it('groups by project and says what happened', async () => {
    renderWith(<NotificationList />)
    const alpha = await screen.findByRole('region', { name: 'Residential Tower Alpha' })
    expect(within(alpha).getByText('Prazo do granito')).toBeInTheDocument()
    expect(within(alpha).getByText('Aguardando sua aprovação · E-mail')).toBeInTheDocument()
    expect(within(alpha).getByText('6 itens extraídos · Reunião')).toBeInTheDocument()
    expect(within(alpha).getAllByRole('img', { name: 'Não lida' })).toHaveLength(2)
    const beta = screen.getByRole('region', { name: 'Commercial Plaza Beta' })
    expect(within(beta).getByText('Carlos marcou como marco')).toBeInTheDocument()
    expect(within(beta).queryByRole('img', { name: 'Não lida' })).not.toBeInTheDocument()
  })

  it('opening one marks it read and goes to it', async () => {
    const user = userEvent.setup()
    renderWith(<NotificationList />)
    await user.click(await screen.findByText('Coordenação MEP'))
    expect(api.post).toHaveBeenCalledWith('/notifications/read', { keys: ['extracted:s2:x'] })
    expect(screen.getByTestId('where')).toHaveTextContent('/projects/p1/meetings/s2')
  })

  it('"Marcar todas como lidas"', async () => {
    const user = userEvent.setup()
    renderWith(<NotificationList />)
    await user.click(await screen.findByRole('button', { name: 'Marcar todas como lidas' }))
    expect(api.post).toHaveBeenCalledWith('/notifications/read', { all: true })
    expect(screen.queryAllByRole('img', { name: 'Não lida' })).toHaveLength(0)
  })

  it('the bell shows the unread count and opens the list', async () => {
    const user = userEvent.setup()
    renderWith(<NotificationsButton />)
    const bell = await screen.findByRole('button', { name: 'Notificações · 2 não lidas' })
    await user.click(bell)
    expect(await screen.findByRole('heading', { name: 'Notificações' })).toBeInTheDocument()
  })

  it('has an empty state', async () => {
    api.get.mockResolvedValue({ data: { notifications: [], unread: 0 } })
    renderWith(<NotificationList />)
    expect(await screen.findByText('Nada novo por aqui')).toBeInTheDocument()
  })

  it('links each kind to where it happened', () => {
    expect(notificationHref(NOTIFICATIONS[0])).toBe('/ingestion?project=p1&focus=s1')
    expect(notificationHref(NOTIFICATIONS[2])).toBe('/projects/p2/milestones?item=i1')
    expect(notificationHref({ ...NOTIFICATIONS[1], source: { id: 's3', type: 'email', title: 'x' } })).toBe('/projects/p1/history')
  })
})
