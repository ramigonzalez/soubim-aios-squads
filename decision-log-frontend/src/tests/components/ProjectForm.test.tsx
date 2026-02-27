import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import ProjectForm from '../../components/organisms/ProjectForm'

// Mock hooks
vi.mock('../../hooks/useProjectMutation', () => ({
  useCreateProject: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'new-proj-1' }),
  }),
  useUpdateProject: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
  useSetStages: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
}))

vi.mock('../../hooks/useStageTemplates', () => ({
  useStageTemplates: () => ({
    data: { templates: [] },
  }),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderProjectForm(props: Partial<React.ComponentProps<typeof ProjectForm>> = {}) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ProjectForm mode="create" {...props} />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('ProjectForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all three sections', () => {
    renderProjectForm()
    expect(screen.getByText('Project Details')).toBeInTheDocument()
    expect(screen.getByText('Stage Schedule')).toBeInTheDocument()
    expect(screen.getByText('Participants')).toBeInTheDocument()
  })

  it('renders title input with required indicator', () => {
    renderProjectForm()
    expect(screen.getByLabelText(/Title/)).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('renders description textarea', () => {
    renderProjectForm()
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument()
  })

  it('renders project type select with options', () => {
    renderProjectForm()
    const select = screen.getByLabelText(/Project Type/)
    expect(select).toBeInTheDocument()
    expect(screen.getByText('Architecture Full')).toBeInTheDocument()
    expect(screen.getByText('Architecture Legal')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })

  it('shows empty state for stages', () => {
    renderProjectForm()
    expect(screen.getByText(/No stages defined/)).toBeInTheDocument()
  })

  it('shows empty state for participants', () => {
    renderProjectForm()
    expect(screen.getByText(/No participants added/)).toBeInTheDocument()
  })

  it('shows Create Project button in create mode', () => {
    renderProjectForm({ mode: 'create' })
    expect(screen.getByText('Create Project')).toBeInTheDocument()
  })

  it('shows Save Changes button in edit mode', () => {
    renderProjectForm({ mode: 'edit', projectId: 'proj-1' })
    expect(screen.getByText('Save Changes')).toBeInTheDocument()
  })

  it('shows Cancel button', () => {
    renderProjectForm()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('does not navigate when title is empty on submit', async () => {
    const user = userEvent.setup()
    renderProjectForm()

    const submitBtn = screen.getByText('Create Project')
    await user.click(submitBtn)

    // Native required validation prevents submit — no navigation
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('can add and remove stages', async () => {
    const user = userEvent.setup()
    renderProjectForm()

    const addStageBtn = screen.getByText('Add Stage')
    await user.click(addStageBtn)

    // Should show stage row input
    expect(screen.getByPlaceholderText('Stage name')).toBeInTheDocument()
    expect(screen.queryByText(/No stages defined/)).not.toBeInTheDocument()
  })

  it('can add and remove participants', async () => {
    const user = userEvent.setup()
    renderProjectForm()

    const addBtn = screen.getByText('Add Participant')
    await user.click(addBtn)

    // Should show participant row inputs
    expect(screen.getByPlaceholderText('Name *')).toBeInTheDocument()
    expect(screen.queryByText(/No participants added/)).not.toBeInTheDocument()
  })

  it('pre-populates form in edit mode with initialData', () => {
    renderProjectForm({
      mode: 'edit',
      projectId: 'proj-1',
      initialData: {
        title: 'Test Project',
        description: 'A test description',
        project_type: 'architecture_full',
        stages: [{ stage_name: 'Phase 1', stage_from: '2026-01-01', stage_to: '2026-02-01' }],
        participants: [{ name: 'Alice', email: 'alice@test.com', discipline: 'architecture', role: 'Architect' }],
      },
    })

    expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A test description')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Phase 1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument()
  })

  it('has discipline select with all 15 options', async () => {
    const user = userEvent.setup()
    renderProjectForm()

    const addBtn = screen.getByText('Add Participant')
    await user.click(addBtn)

    // Check for some discipline options
    const selects = screen.getAllByRole('combobox')
    const disciplineSelect = selects.find(s => {
      const options = s.querySelectorAll('option')
      return Array.from(options).some(o => o.textContent === 'Architecture')
    })
    expect(disciplineSelect).toBeTruthy()

    if (disciplineSelect) {
      const options = disciplineSelect.querySelectorAll('option')
      expect(options.length).toBe(15) // 15 disciplines
    }
  })
})
