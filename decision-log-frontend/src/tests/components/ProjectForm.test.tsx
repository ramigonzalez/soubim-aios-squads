import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectForm } from '../../components/organisms/ProjectForm'

describe('ProjectForm Component', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(<ProjectForm onSubmit={mockOnSubmit} />)

    expect(screen.getByLabelText('Project Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Project Type')).toBeInTheDocument()
    expect(screen.getByLabelText('Google Drive Folder ID')).toBeInTheDocument()
  })

  it('renders Google Drive Folder ID help text', () => {
    render(<ProjectForm onSubmit={mockOnSubmit} />)
    expect(
      screen.getByText(/Paste the folder ID from Google Drive/)
    ).toBeInTheDocument()
  })

  it('renders Google Drive Folder ID placeholder', () => {
    render(<ProjectForm onSubmit={mockOnSubmit} />)
    const input = screen.getByLabelText('Google Drive Folder ID')
    expect(input).toHaveAttribute('placeholder', 'e.g., 1a2b3c4d5e6f7g8h9i0j')
  })

  it('shows "Create Project" button when no initialData', () => {
    render(<ProjectForm onSubmit={mockOnSubmit} />)
    expect(screen.getByText('Create Project')).toBeInTheDocument()
  })

  it('shows "Update Project" button when initialData has id', () => {
    render(
      <ProjectForm
        initialData={{ id: 'proj-1', name: 'Test' }}
        onSubmit={mockOnSubmit}
      />
    )
    expect(screen.getByText('Update Project')).toBeInTheDocument()
  })

  it('shows "Saving..." button when isLoading', () => {
    render(<ProjectForm onSubmit={mockOnSubmit} isLoading />)
    expect(screen.getByText('Saving...')).toBeInTheDocument()
  })

  it('pre-fills fields from initialData', () => {
    render(
      <ProjectForm
        initialData={{
          name: 'Test Project',
          description: 'A description',
          project_type: 'residential',
          drive_folder_id: 'folder-abc',
        }}
        onSubmit={mockOnSubmit}
      />
    )

    expect(screen.getByLabelText('Project Name')).toHaveValue('Test Project')
    expect(screen.getByLabelText('Description')).toHaveValue('A description')
    expect(screen.getByLabelText('Project Type')).toHaveValue('residential')
    expect(screen.getByLabelText('Google Drive Folder ID')).toHaveValue('folder-abc')
  })

  it('submits form data including drive_folder_id', async () => {
    const user = userEvent.setup()
    render(<ProjectForm onSubmit={mockOnSubmit} />)

    await user.type(screen.getByLabelText('Project Name'), 'New Project')
    await user.type(screen.getByLabelText('Description'), 'Some description')
    await user.type(screen.getByLabelText('Google Drive Folder ID'), 'folder-xyz')
    await user.click(screen.getByText('Create Project'))

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Project',
        description: 'Some description',
        drive_folder_id: 'folder-xyz',
      })
    )
  })

  it('submits undefined drive_folder_id when empty', async () => {
    const user = userEvent.setup()
    render(<ProjectForm onSubmit={mockOnSubmit} />)

    await user.type(screen.getByLabelText('Project Name'), 'Project')
    await user.click(screen.getByText('Create Project'))

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        drive_folder_id: undefined,
      })
    )
  })

  it('disables submit button when name is empty', () => {
    render(<ProjectForm onSubmit={mockOnSubmit} />)
    const button = screen.getByText('Create Project')
    expect(button).toBeDisabled()
  })

  it('renders cancel button when onCancel provided', () => {
    render(<ProjectForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('does not render cancel button when onCancel not provided', () => {
    render(<ProjectForm onSubmit={mockOnSubmit} />)
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('calls onCancel when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<ProjectForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
    await user.click(screen.getByText('Cancel'))
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })
})
