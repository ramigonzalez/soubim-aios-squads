import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from 'react-query'
import i18n from '../../i18n'
import FathomRulesSection from '../../components/organisms/FathomRulesSection'
import { integrationsService } from '../../services/integrationsService'

vi.mock('../../services/integrationsService', () => ({
  integrationsService: {
    listFathomRules: vi.fn(),
    createFathomRule: vi.fn(),
    deleteFathomRule: vi.fn(),
  },
}))

type Mocked = ReturnType<typeof vi.fn>
const service = integrationsService as unknown as Record<'listFathomRules' | 'createFathomRule' | 'deleteFathomRule', Mocked>

const RULES = [
  { id: 'r1', project_id: 'p1', field: 'title', operator: 'contains', value: 'D/SEASON', created_at: null },
  { id: 'r2', project_id: 'p1', field: 'participant_domain', operator: 'equals', value: 'cliente.com', created_at: null },
]

function wrap() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><FathomRulesSection projectId="p1" /></QueryClientProvider>)
}

describe('FathomRulesSection (Story 13.16)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    service.listFathomRules.mockResolvedValue(RULES)
    service.createFathomRule.mockResolvedValue({})
    service.deleteFathomRule.mockResolvedValue(undefined)
  })

  it('lists the rules', async () => {
    wrap()
    expect(await screen.findByRole('heading', { name: 'Fathom rules' })).toBeInTheDocument()
    expect(screen.getByText('D/SEASON')).toBeInTheDocument()
    expect(screen.getByText('cliente.com')).toBeInTheDocument()
    expect(screen.getAllByText('Participant domain is').length).toBeGreaterThan(0)
  })

  it('renders nothing when the user cannot manage rules (403)', async () => {
    service.listFathomRules.mockRejectedValue({ response: { status: 403 } })
    const { container } = wrap()
    await waitFor(() => expect(service.listFathomRules).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('shows an empty state', async () => {
    service.listFathomRules.mockResolvedValue([])
    wrap()
    expect(await screen.findByText(/No rules yet/)).toBeInTheDocument()
  })

  it('adds a rule (field + trimmed value)', async () => {
    wrap()
    await screen.findByText('D/SEASON')
    await userEvent.selectOptions(screen.getByLabelText('Field'), 'participant_email')
    await userEvent.type(screen.getByLabelText('Value'), '  ana@cliente.com ')
    await userEvent.click(screen.getByRole('button', { name: 'Add rule' }))
    await waitFor(() => expect(service.createFathomRule).toHaveBeenCalledWith('p1', { field: 'participant_email', value: 'ana@cliente.com' }))
    await waitFor(() => expect(service.listFathomRules).toHaveBeenCalledTimes(2))
  })

  it('refuses a domain with @ before calling the API', async () => {
    wrap()
    await screen.findByText('D/SEASON')
    await userEvent.selectOptions(screen.getByLabelText('Field'), 'participant_domain')
    await userEvent.type(screen.getByLabelText('Value'), '@cliente.com')
    await userEvent.click(screen.getByRole('button', { name: 'Add rule' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('a domain has no @')
    expect(service.createFathomRule).not.toHaveBeenCalled()
  })

  it('explains a duplicate', async () => {
    service.createFathomRule.mockRejectedValue({ response: { status: 409 } })
    wrap()
    await screen.findByText('D/SEASON')
    await userEvent.type(screen.getByLabelText('Value'), 'D/SEASON')
    await userEvent.click(screen.getByRole('button', { name: 'Add rule' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists')
  })

  it('removes a rule', async () => {
    wrap()
    await userEvent.click(await screen.findByRole('button', { name: 'Remove rule: Title contains "D/SEASON"' }))
    await waitFor(() => expect(service.deleteFathomRule).toHaveBeenCalledWith('p1', 'r1'))
  })
})
