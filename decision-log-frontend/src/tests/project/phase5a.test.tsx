/**
 * Promem revamp Phase 5a: Pedidos do site on the platform page (pt-BR).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from 'react-query'
import * as apiModule from '../../services/api'
import { ToastProvider } from '../../design-system'
import { SiteLeads } from '../../components/organisms/SiteLeads'
import { formatPhone } from '../../hooks/useLeads'
import { usePortuguese } from '../design-system/render'

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }))
const api = apiModule.default as unknown as Record<'get' | 'patch', ReturnType<typeof vi.fn>>

const LEADS = [
  { id: 'l1', mode: 'pilot', name: 'Gabriela', company: 'souBIM', whatsapp: '11987654321', email: 'g@soubim.com.br', role: 'partner', team_size: '10-24', created_at: '2026-10-16T10:00:00', handled_at: null, handled_by: null },
  { id: 'l2', mode: 'demo', name: 'Carlos', company: 'MEP Ltda', whatsapp: '1134567890', email: 'c@mep.com', role: null, team_size: null, created_at: '2026-10-15T10:00:00', handled_at: '2026-10-15T12:00:00', handled_by: 'Operadora' },
]

function renderLeads() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ToastProvider>
        <SiteLeads />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('Phase 5a · Pedidos do site', () => {
  usePortuguese()
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({ data: { leads: LEADS } })
    api.patch.mockResolvedValue({ data: {} })
  })

  it('lists requests with mode, contact and state', async () => {
    renderLeads()
    const gabriela = (await screen.findByText('Gabriela')).closest('li')!
    expect(within(gabriela).getByText('Piloto gratuito')).toBeInTheDocument()
    expect(within(gabriela).getByRole('link', { name: 'WhatsApp (11) 9 8765-4321' })).toHaveAttribute('href', 'https://wa.me/5511987654321')
    expect(within(gabriela).getByText('Sócio(a) ou diretor(a)')).toBeInTheDocument()
    const carlos = screen.getByText('Carlos').closest('li')!
    expect(within(carlos).getByText('Atendido')).toBeInTheDocument()
    expect(within(carlos).getByText(/Atendido por Operadora/)).toBeInTheDocument()
    expect(screen.getByText('2 pedidos · 1 em aberto')).toBeInTheDocument()
  })

  it('marks one as handled, with Desfazer', async () => {
    const user = userEvent.setup()
    renderLeads()
    await user.click(within((await screen.findByText('Gabriela')).closest('li')!).getByRole('button', { name: 'Marcar como atendido' }))
    expect(api.patch).toHaveBeenCalledWith('/platform/leads/l1', { handled: true })
    await user.click(await screen.findByRole('button', { name: 'Desfazer' }))
    expect(api.patch).toHaveBeenLastCalledWith('/platform/leads/l1', { handled: false })
  })

  it('has an empty state', async () => {
    api.get.mockResolvedValue({ data: { leads: [] } })
    renderLeads()
    expect(await screen.findByText('Nenhum pedido ainda')).toBeInTheDocument()
  })

  it('formats phones', () => {
    expect(formatPhone('11987654321')).toBe('(11) 9 8765-4321')
    expect(formatPhone('1134567890')).toBe('(11) 3456-7890')
  })
})
