/**
 * Story 12.15: project settings layout — "Project details" box (saved by its button) and separate boxes
 * that save automatically; external people (and other non-admins) get no admin box.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import ProjectEdit from '../../pages/ProjectEdit'

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

import api from '../../services/api'

const mockedApi = vi.mocked(api)

const project = (over = {}) => ({
  id: 'p1', name: 'Project X', description: '', project_type: '', stages: [], participant_count: 0,
  created_at: '2026-10-01T00:00:00Z', members: [], access_level: 'admin', can_review: true, can_manage: true,
  is_external: false, ...over,
})

function mockApi(detail: ReturnType<typeof project>, forbidden: string[] = []) {
  mockedApi.get.mockImplementation(async (url: string) => {
    if (forbidden.some(path => url.endsWith(path))) throw { response: { status: 403 } }
    if (url === '/projects/p1') return { data: detail }
    if (url.endsWith('/stages')) return { data: { stages: [] } }
    if (url.endsWith('/participants')) return { data: { participants: [] } }
    if (url.endsWith('/organizations')) return { data: { organizations: [] } }
    if (url.endsWith('/externals')) return { data: { externals: [], invitations: [] } }
    if (url.endsWith('/fathom-rules')) return { data: [] }
    if (url.startsWith('/stage-templates')) return { data: [] }
    if (url.endsWith('/drive-folder')) {
      return { data: { configured: false, service_account_email: null, folder_id: null, folder_name: null, last_checked_at: null, error: null } }
    }
    throw new Error(`unexpected GET ${url}`)
  })
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/projects/p1/edit']}>
        <Routes>
          <Route path="/projects/:id/edit" element={<ProjectEdit />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ProjectEdit layout (Story 12.15)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('admin: project details box with its save button, and auto-saved boxes for the other sections', async () => {
    mockApi(project())
    renderPage()
    expect(await screen.findByText('External people')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update Project' })).toBeInTheDocument()
    for (const title of ['Organizations with access', 'External people', 'Google Drive folder']) {
      const heading = await screen.findByRole('heading', { name: title })
      expect(heading.closest('section')).toHaveTextContent('Saved automatically')
    }
    // the details box does not claim to save automatically
    const details = screen.getByRole('button', { name: 'Update Project' }).closest('form')!
    expect(details).not.toHaveTextContent('Saved automatically')
  })

  it('external person: no admin box, no Fathom rules', async () => {
    mockApi(project({ access_level: 'read', can_review: false, can_manage: false, is_external: true }), [
      '/organizations', '/externals', '/drive-folder', '/fathom-rules',
    ])
    renderPage()
    expect(await screen.findByText('Edit Project')).toBeInTheDocument()
    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/projects/p1'))
    expect(screen.queryByRole('button', { name: 'Update Project' })).not.toBeInTheDocument()
    expect(screen.queryByText('External people')).not.toBeInTheDocument()
    expect(screen.queryByText('Organizations with access')).not.toBeInTheDocument()
    expect(mockedApi.get).not.toHaveBeenCalledWith('/projects/p1/externals')
    expect(mockedApi.get).not.toHaveBeenCalledWith('/projects/p1/fathom-rules')
    expect(screen.queryByText('Saved automatically')).not.toBeInTheDocument()
  })
})
