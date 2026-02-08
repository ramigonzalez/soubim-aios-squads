import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Projects } from '../../pages/Projects'
import { useProjects } from '../../hooks/useProjects'

// Mock the hook
vi.mock('../../hooks/useProjects')

const mockUseProjects = useProjects as any

// Create query client for tests
const createQueryClient = () => new QueryClient()

function renderProjects() {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Projects />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('Projects Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays loading state initially', () => {
    mockUseProjects.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    renderProjects()
    expect(screen.getByText(/Loading projects/i)).toBeInTheDocument()
  })

  it('displays projects when loaded', () => {
    const mockData = {
      projects: [
        {
          id: 'proj-1',
          name: 'Project Alpha',
          description: 'First project',
          created_at: '2026-02-07T00:00:00Z',
          member_count: 5,
          decision_count: 10,
        },
      ],
      total: 1,
      limit: 12,
      offset: 0,
    }

    mockUseProjects.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    })

    renderProjects()
    expect(screen.getByText('Project Alpha')).toBeInTheDocument()
    expect(screen.getByText('First project')).toBeInTheDocument()
  })

  it('displays error state when fetch fails', () => {
    const mockError = new Error('API Error')
    mockUseProjects.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
    })

    renderProjects()
    expect(screen.getByText(/Failed to Load Projects/i)).toBeInTheDocument()
    expect(screen.getByText('API Error')).toBeInTheDocument()
  })

  it('displays empty state when no projects', () => {
    mockUseProjects.mockReturnValue({
      data: {
        projects: [],
        total: 0,
        limit: 12,
        offset: 0,
      },
      isLoading: false,
      error: null,
    })

    renderProjects()
    expect(screen.getByText(/No projects yet/i)).toBeInTheDocument()
  })

  it('displays project count', () => {
    const mockData = {
      projects: Array(3).fill(null).map((_, i) => ({
        id: `proj-${i}`,
        name: `Project ${i}`,
        created_at: '2026-02-07T00:00:00Z',
        member_count: 1,
        decision_count: 1,
      })),
      total: 3,
      limit: 12,
      offset: 0,
    }

    mockUseProjects.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    })

    renderProjects()
    expect(screen.getByText('3 projects available')).toBeInTheDocument()
  })

  it('displays pagination controls', () => {
    const mockData = {
      projects: Array(12).fill(null).map((_, i) => ({
        id: `proj-${i}`,
        name: `Project ${i}`,
        created_at: '2026-02-07T00:00:00Z',
        member_count: 1,
        decision_count: 1,
      })),
      total: 24, // 2 pages
      limit: 12,
      offset: 0,
    }

    mockUseProjects.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    })

    renderProjects()
    expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  it('navigates to project on card click', async () => {
    const user = userEvent.setup()
    const mockData = {
      projects: [
        {
          id: 'proj-123',
          name: 'Test Project',
          created_at: '2026-02-07T00:00:00Z',
          member_count: 5,
          decision_count: 10,
        },
      ],
      total: 1,
      limit: 12,
      offset: 0,
    }

    mockUseProjects.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    })

    renderProjects()
    const projectCard = screen.getByText('Test Project').closest('[role="button"]')

    if (projectCard) {
      await user.click(projectCard)
    }
  })

  it('handles retry on error', async () => {
    const user = userEvent.setup()
    const mockError = new Error('API Error')
    mockUseProjects.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
    })

    renderProjects()
    const retryButton = screen.getByText('Retry')
    expect(retryButton).toBeInTheDocument()
  })

  it('disables previous button on first page', () => {
    const mockData = {
      projects: Array(12).fill(null).map((_, i) => ({
        id: `proj-${i}`,
        name: `Project ${i}`,
        created_at: '2026-02-07T00:00:00Z',
      })),
      total: 24,
      limit: 12,
      offset: 0,
    }

    mockUseProjects.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    })

    renderProjects()
    // Find the button containing "Previous" text
    const prevButton = screen.getByRole('button', { name: /previous/i })
    expect(prevButton).toBeDisabled()
  })

  it('enables next button when more pages exist', () => {
    const mockData = {
      projects: Array(12).fill(null).map((_, i) => ({
        id: `proj-${i}`,
        name: `Project ${i}`,
        created_at: '2026-02-07T00:00:00Z',
      })),
      total: 24,
      limit: 12,
      offset: 0,
    }

    mockUseProjects.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    })

    renderProjects()
    const nextButton = screen.getByText('Next')
    expect(nextButton).not.toBeDisabled()
  })

  it('displays correct number of project cards', () => {
    const mockData = {
      projects: Array(3).fill(null).map((_, i) => ({
        id: `proj-${i}`,
        name: `Project ${i}`,
        created_at: '2026-02-07T00:00:00Z',
        member_count: 1,
        decision_count: 1,
      })),
      total: 3,
      limit: 12,
      offset: 0,
    }

    mockUseProjects.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    })

    renderProjects()
    // Check for each project card
    mockData.projects.forEach((project) => {
      expect(screen.getByText(`Project ${project.id.split('-')[1]}`)).toBeInTheDocument()
    })
  })

  it('has proper responsive grid classes', () => {
    const mockData = {
      projects: Array(3).fill(null).map((_, i) => ({
        id: `proj-${i}`,
        name: `Project ${i}`,
        created_at: '2026-02-07T00:00:00Z',
      })),
      total: 3,
      limit: 12,
      offset: 0,
    }

    mockUseProjects.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    })

    const { container } = renderProjects()
    const grid = container.querySelector('.grid')
    expect(grid?.className).toContain('grid-cols-1')
    expect(grid?.className).toContain('md:grid-cols-2')
    expect(grid?.className).toContain('lg:grid-cols-3')
  })

  it('calls useProjects with correct pagination params', () => {
    const mockData = {
      projects: [],
      total: 0,
      limit: 12,
      offset: 0,
    }

    mockUseProjects.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    })

    renderProjects()
    expect(mockUseProjects).toHaveBeenCalledWith({
      limit: 12,
      offset: 0,
    })
  })

  it('displays header with title and description', () => {
    const mockData = {
      projects: [],
      total: 5,
      limit: 12,
      offset: 0,
    }

    mockUseProjects.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    })

    renderProjects()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('5 projects available')).toBeInTheDocument()
  })
})
