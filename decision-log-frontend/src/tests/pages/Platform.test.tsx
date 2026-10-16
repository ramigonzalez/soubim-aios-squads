import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import Platform from '../../pages/Platform'
import api from '../../services/api'
import { ToastProvider, TooltipProvider } from '../../design-system'

const ORGS = [
  {
    id: 'org-1', name: 'Acme', slug: 'acme', status: 'active', created_at: '2026-01-01T00:00:00Z',
    member_count: 3, project_count: 2, last_activity_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'org-2', name: 'Late Co', slug: 'late-co', status: 'payment_pending', created_at: '2026-02-01T00:00:00Z',
    member_count: 1, project_count: 0, last_activity_at: null,
  },
]
const INVITATIONS = [
  {
    id: 'inv-1', organization_id: null, organization_name: 'NewCo', email: 'ceo@newco.com', role: 'owner',
    status: 'pending', expires_at: '2026-10-21T00:00:00Z', created_at: '2026-10-14T00:00:00Z',
  },
]

function setup() {
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/platform/organizations') return { data: { organizations: ORGS } }
    if (url === '/platform/organizations/org-1')
      return { data: { ...ORGS[0], members: [{ name: 'Ana Owner', email: 'ana@acme.com', role: 'owner' }] } }
    if (url === '/platform/invitations') return { data: { invitations: INVITATIONS } }
    return { data: {} }
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ToastProvider>
          <MemoryRouter>
            <Platform />
          </MemoryRouter>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

describe('Platform page (Story 12.13)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Radix Select needs these in the DOM test environment
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = () => undefined
  })

  it('lists organizations with counts and status', async () => {
    setup()
    expect(await screen.findByText('Acme')).toBeInTheDocument()
    expect(screen.getByText(/Members 3 · Projects 2/)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Status of Acme' })).toHaveTextContent('Active')
    expect(screen.getByRole('combobox', { name: 'Status of Late Co' })).toHaveTextContent('Payment pending')
  })

  it('changes the status; blocking asks for confirmation first', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: { ...ORGS[0], status: 'payment_pending' } })
    setup()
    const select = await screen.findByRole('combobox', { name: 'Status of Acme' })

    await userEvent.click(select)
    await userEvent.click(await screen.findByRole('option', { name: 'Payment pending' }))
    expect(patch).toHaveBeenCalledWith('/platform/organizations/org-1', { status: 'payment_pending' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(select)
    await userEvent.click(await screen.findByRole('option', { name: 'Blocked' }))
    let dialog = await screen.findByRole('dialog', { name: 'Block Acme?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' })) // cancelled
    expect(patch).toHaveBeenCalledTimes(1)

    await userEvent.click(select)
    await userEvent.click(await screen.findByRole('option', { name: 'Blocked' }))
    dialog = await screen.findByRole('dialog', { name: 'Block Acme?' })
    expect(within(dialog).getByText(/Its members lose access/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Block organization' }))
    expect(patch).toHaveBeenLastCalledWith('/platform/organizations/org-1', { status: 'blocked' })
  })

  it('shows the members of an organization on demand', async () => {
    setup()
    const acmeRow = (await screen.findByText('Acme')).closest('li') as HTMLElement
    await userEvent.click(within(acmeRow).getByRole('button', { name: 'Members' }))
    const region = await screen.findByRole('region', { name: 'Members of Acme' })
    expect(await within(region).findByText('Ana Owner')).toBeInTheDocument()
    expect(within(region).getByText('ana@acme.com')).toBeInTheDocument()
  })

  it('invites a new company and shows the link once with a copy button', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: { ...INVITATIONS[0], id: 'inv-2', email: 'boss@x.com', invite_url: 'http://app/invite/tok' },
    })
    setup()
    await userEvent.type(await screen.findByLabelText('Company name'), 'X Corp')
    await userEvent.type(screen.getByLabelText("Owner's email"), 'boss@x.com')
    await userEvent.click(screen.getByRole('button', { name: 'Create invitation' }))
    expect(post).toHaveBeenCalledWith('/platform/invitations', { email: 'boss@x.com', organization_name: 'X Corp' })
    expect(await screen.findByLabelText('Invitation link')).toHaveValue('http://app/invite/tok')
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
  })

  it('lists pending company invitations and revokes them', async () => {
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: null })
    setup()
    expect(await screen.findByText('NewCo')).toBeInTheDocument()
    expect(screen.getByText('ceo@newco.com')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }))
    expect(del).not.toHaveBeenCalled() // irreversible: confirmed in a dialog first
    const dialog = await screen.findByRole('dialog', { name: 'Revoke invitation?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Revoke invitation' }))
    expect(del).toHaveBeenCalledWith('/platform/invitations/inv-1')
  })
})
