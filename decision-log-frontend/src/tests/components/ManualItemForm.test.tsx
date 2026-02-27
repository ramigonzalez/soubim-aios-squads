/**
 * Tests for ManualItemForm component.
 * Story 7.3: Manual Input — Create Project Item Form
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import ManualItemForm from '../../components/organisms/ManualItemForm'
import { DISCIPLINE_LABELS, ALL_DISCIPLINES } from '../../types/projectItem'

// --- Mocks ---

const mockMutateAsync = vi.fn()
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

let mockIsLoading = false
vi.mock('../../hooks/useProjectItemMutation', () => ({
  useCreateProjectItem: () => ({
    mutateAsync: mockMutateAsync,
    get isLoading() { return mockIsLoading },
  }),
}))

const mockParticipants = [
  { id: 'p1', name: 'Alice Chen', email: 'alice@test.com', discipline: 'architecture', role: 'Architect' },
  { id: 'p2', name: 'Bob Silva', email: 'bob@test.com', discipline: 'structural', role: 'Engineer' },
]

vi.mock('../../hooks/useParticipants', () => ({
  useParticipants: () => ({
    data: mockParticipants,
    isLoading: false,
  }),
}))

// --- Helpers ---

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/projects/proj-123/items/new']}>
        <Routes>
          <Route
            path="/projects/:id/items/new"
            element={<ManualItemForm projectId="proj-123" />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function getTodayString(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  // Statement
  await user.type(screen.getByLabelText(/Statement/), 'Test item statement')

  // Item type
  await user.selectOptions(screen.getByLabelText(/Item Type/), 'decision')

  // Select a discipline
  const architectureCheckbox = screen.getByRole('checkbox', { name: /Architecture/ })
  await user.click(architectureCheckbox)

  // Who
  await user.type(screen.getByLabelText(/Who/), 'Alice Chen')

  // Date is already defaulted to today
}

// --- Tests ---

describe('ManualItemForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLoading = false
    mockMutateAsync.mockResolvedValue({ id: 'new-item-1' })
  })

  // --- Rendering ---

  it('renders all base fields', () => {
    renderForm()

    expect(screen.getByLabelText(/Statement/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Item Type/)).toBeInTheDocument()
    expect(screen.getByText(/Affected Disciplines/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Who/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Date/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Context/)).toBeInTheDocument()
  })

  it('does not render conditional fields initially', () => {
    renderForm()

    // Owner and Due Date are action_item only
    expect(screen.queryByLabelText(/Owner/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Due Date/)).not.toBeInTheDocument()
    // Consensus is decision only
    expect(screen.queryByText('Consensus')).not.toBeInTheDocument()
  })

  it('defaults date to today', () => {
    renderForm()

    const dateInput = screen.getByLabelText(/Date/) as HTMLInputElement
    expect(dateInput.value).toBe(getTodayString())
  })

  // --- Conditional: Action Item ---

  it('shows owner and due_date when item_type is action_item', async () => {
    renderForm()
    const user = userEvent.setup()

    await user.selectOptions(screen.getByLabelText(/Item Type/), 'action_item')

    expect(screen.getByLabelText(/Owner/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Due Date/)).toBeInTheDocument()
  })

  it('hides owner and due_date when item_type changes from action_item', async () => {
    renderForm()
    const user = userEvent.setup()

    // Select action_item
    await user.selectOptions(screen.getByLabelText(/Item Type/), 'action_item')
    expect(screen.getByLabelText(/Owner/)).toBeInTheDocument()

    // Change to idea
    await user.selectOptions(screen.getByLabelText(/Item Type/), 'idea')
    expect(screen.queryByLabelText(/Owner/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Due Date/)).not.toBeInTheDocument()
  })

  // --- Conditional: Decision ---

  it('shows consensus section when item_type is decision and disciplines selected', async () => {
    renderForm()
    const user = userEvent.setup()

    await user.selectOptions(screen.getByLabelText(/Item Type/), 'decision')
    // Select a discipline so consensus rows appear
    const archCheckbox = screen.getByRole('checkbox', { name: /Architecture/ })
    await user.click(archCheckbox)

    expect(screen.getByText('Consensus')).toBeInTheDocument()
  })

  // --- Discipline multi-select ---

  it('renders all 15 discipline checkboxes', () => {
    renderForm()

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(ALL_DISCIPLINES.length)

    // Verify some labels
    ALL_DISCIPLINES.forEach((d) => {
      expect(screen.getByRole('checkbox', { name: DISCIPLINE_LABELS[d] })).toBeInTheDocument()
    })
  })

  it('toggles discipline selection', async () => {
    renderForm()
    const user = userEvent.setup()

    const archCheckbox = screen.getByRole('checkbox', { name: /Architecture/ })
    expect(archCheckbox).not.toBeChecked()

    await user.click(archCheckbox)
    expect(archCheckbox).toBeChecked()

    await user.click(archCheckbox)
    expect(archCheckbox).not.toBeChecked()
  })

  it('consensus rows match selected disciplines', async () => {
    renderForm()
    const user = userEvent.setup()

    await user.selectOptions(screen.getByLabelText(/Item Type/), 'decision')
    await user.click(screen.getByRole('checkbox', { name: /Architecture/ }))
    await user.click(screen.getByRole('checkbox', { name: /Structural/ }))

    // Both consensus status selects should appear
    expect(screen.getByLabelText(/Architecture consensus status/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Structural consensus status/)).toBeInTheDocument()
  })

  // --- Validation ---

  it('shows all required field errors on empty submit', async () => {
    renderForm()
    const user = userEvent.setup()

    // Clear the date (it defaults to today)
    const dateInput = screen.getByLabelText(/Date/) as HTMLInputElement
    await user.clear(dateInput)

    await user.click(screen.getByRole('button', { name: /Save Item/ }))

    expect(screen.getByText('Statement is required')).toBeInTheDocument()
    expect(screen.getByText('Item type is required')).toBeInTheDocument()
    expect(screen.getByText('Select at least one discipline')).toBeInTheDocument()
    expect(screen.getByText('Who is required')).toBeInTheDocument()
    expect(screen.getByText('Date is required')).toBeInTheDocument()
  })

  it('does not submit when validation fails', async () => {
    renderForm()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Save Item/ }))

    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  // --- Submission ---

  it('calls mutation with correct payload for decision type', async () => {
    renderForm()
    const user = userEvent.setup()

    // Fill fields
    await user.type(screen.getByLabelText(/Statement/), 'Use CLT panels for roof')
    await user.selectOptions(screen.getByLabelText(/Item Type/), 'decision')
    await user.click(screen.getByRole('checkbox', { name: /Structural/ }))
    await user.type(screen.getByLabelText(/Who/), 'Gabriela')

    // Set consensus
    const statusSelect = screen.getByLabelText(/Structural consensus status/)
    await user.selectOptions(statusSelect, 'AGREE')

    await user.click(screen.getByRole('button', { name: /Save Item/ }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1)
    })

    const payload = mockMutateAsync.mock.calls[0][0]
    expect(payload.statement).toBe('Use CLT panels for roof')
    expect(payload.item_type).toBe('decision')
    expect(payload.affected_disciplines).toEqual(['structural'])
    expect(payload.who).toBe('Gabriela')
    expect(payload.source_type).toBe('manual_input')
    expect(payload.consensus).toEqual({
      structural: { status: 'AGREE', notes: null },
    })
  })

  it('calls mutation with source_type manual_input', async () => {
    renderForm()
    const user = userEvent.setup()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /Save Item/ }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1)
    })

    const payload = mockMutateAsync.mock.calls[0][0]
    expect(payload.source_type).toBe('manual_input')
  })

  it('shows loading state during submission', () => {
    mockIsLoading = true
    renderForm()

    const submitBtn = screen.getByRole('button', { name: /Saving/ })
    expect(submitBtn).toBeDisabled()
    expect(submitBtn).toHaveTextContent('Saving...')
  })

  it('shows error banner on API failure', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Server error'))
    renderForm()
    const user = userEvent.setup()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /Save Item/ }))

    await waitFor(() => {
      expect(screen.getByText(/Server error/)).toBeInTheDocument()
    })

    // Should NOT navigate
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('navigates on successful submission', async () => {
    mockMutateAsync.mockResolvedValueOnce({ id: 'new-item-42' })
    renderForm()
    const user = userEvent.setup()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /Save Item/ }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-123/history?highlight=new-item-42')
    })
  })
})
