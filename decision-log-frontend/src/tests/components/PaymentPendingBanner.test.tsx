import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { PaymentPendingBanner } from '../../components/molecules/PaymentPendingBanner'
import { useAuthStore } from '../../store/authStore'
import { useOrganizationStore } from '../../store/organizationStore'
import api from '../../services/api'

function setup(organizations: Array<{ id: string; name: string; status: string }>) {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: organizations.map(o => ({ ...o, slug: o.id, role: 'member' })),
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <PaymentPendingBanner />
    </QueryClientProvider>
  )
}

describe('PaymentPendingBanner (Story 12.13)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    useOrganizationStore.setState({ activeOrganizationId: null })
    useAuthStore.getState().setAuth({ id: 'u1', email: 'a@x.com', name: 'A', role: 'client' }, 'jwt')
  })

  it('shows when the active organization has a pending payment', async () => {
    setup([{ id: 'org-1', name: 'Acme', status: 'payment_pending' }])
    const banner = await screen.findByRole('alert')
    expect(banner).toHaveTextContent('Payment pending')
    expect(banner).toHaveTextContent('Acme')
  })

  it('is hidden for an active organization', async () => {
    setup([{ id: 'org-1', name: 'Acme', status: 'active' }])
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/organizations/me'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('follows the active organization', async () => {
    useOrganizationStore.setState({ activeOrganizationId: 'org-2' })
    setup([
      { id: 'org-1', name: 'Acme', status: 'payment_pending' },
      { id: 'org-2', name: 'Other', status: 'active' },
    ])
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/organizations/me'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
