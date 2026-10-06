import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from 'react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import i18n from '../../i18n'
import { MeetingViewer } from '../../pages/MeetingViewer'
import type { Meeting } from '../../hooks/useMeeting'

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), patch: vi.fn(), defaults: { baseURL: 'http://localhost:8000/api' } },
}))

import api from '../../services/api'

const mockedApi = vi.mocked(api)

const useMeetingMock = vi.fn()
vi.mock('../../hooks/useMeeting', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/useMeeting')>('../../hooks/useMeeting')
  return { ...actual, useMeeting: (id: string) => useMeetingMock(id) }
})

const TRANSCRIPT = `Title line

---

0:00 - Camila Bittencourt Ivo (Dimas Construções)
  Oi, bom dia.

0:40 - Gabriela Cavalheiro (eusoubim.com)
  Vamos começar pelas pranchas.

1:09 - ⚠️ Camila / Erica [mixed voices]
  Com soleira.
`

function makeMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'src-1',
    project_id: 'proj-1',
    title: 'souBIM + DIMAS | D/SEASON - Quinzenal',
    source_type: 'meeting',
    occurred_at: '2026-09-04T00:00:00',
    duration_minutes: 98,
    summary: 'Resumo',
    transcript: TRANSCRIPT,
    recording: null,
    ...overrides,
  }
}

function renderAt(url: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/meetings/:sourceId" element={<MeetingViewer />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('MeetingViewer (Story 7.13)', () => {
  beforeEach(() => {
    useMeetingMock.mockReset()
    // jsdom/happy-dom don't implement scrolling or media playback
    Element.prototype.scrollTo = vi.fn()
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
  })

  it('shows title, date, duration and every transcript turn', () => {
    useMeetingMock.mockReturnValue({ data: makeMeeting(), isLoading: false, error: null })
    renderAt('/meetings/src-1')

    expect(useMeetingMock).toHaveBeenCalledWith('src-1')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('souBIM + DIMAS | D/SEASON - Quinzenal')
    expect(screen.getByText('Sep 4, 2026')).toBeInTheDocument()
    expect(screen.getByText('98 min')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText('Camila / Erica')).toBeInTheDocument()
    expect(screen.getByText('mixed voices')).toBeInTheDocument()
  })

  it('without a recording, highlights the turn at ?t', () => {
    useMeetingMock.mockReturnValue({ data: makeMeeting(), isLoading: false, error: null })
    renderAt('/meetings/src-1?t=65')

    expect(screen.queryByTestId('meeting-video')).not.toBeInTheDocument()
    const current = screen.getAllByRole('listitem').find(li => li.getAttribute('aria-current') === 'true')
    expect(current).toHaveTextContent('Vamos começar pelas pranchas.')
  })

  it('plays a stored recording from the API origin', () => {
    useMeetingMock.mockReturnValue({
      data: makeMeeting({ recording: { type: 'file', url: '/api/recordings/src-1?expires=1&signature=abc' } }),
      isLoading: false,
      error: null,
    })
    renderAt('/meetings/src-1?t=40')

    const video = screen.getByTestId('meeting-video') as HTMLVideoElement
    expect(video.getAttribute('src')).toMatch(/\/api\/recordings\/src-1\?expires=1&signature=abc$/)
  })

  it('clicking a turn seeks the recording there', async () => {
    useMeetingMock.mockReturnValue({
      data: makeMeeting({ recording: { type: 'file', url: '/api/recordings/src-1?expires=1&signature=abc' } }),
      isLoading: false,
      error: null,
    })
    renderAt('/meetings/src-1')

    await userEvent.setup().click(screen.getByText('Com soleira.'))
    const video = screen.getByTestId('meeting-video') as HTMLVideoElement
    expect(video.currentTime).toBe(69)
    expect(screen.getByText('Com soleira.').closest('li')).toHaveAttribute('aria-current', 'true')
  })

  it('links to an external recording', () => {
    useMeetingMock.mockReturnValue({
      data: makeMeeting({ recording: { type: 'external', url: 'https://fathom.video/share/abc' } }),
      isLoading: false,
      error: null,
    })
    renderAt('/meetings/src-1')

    expect(screen.getByRole('link', { name: 'Open recording' })).toHaveAttribute('href', 'https://fathom.video/share/abc')
    expect(screen.queryByTestId('meeting-video')).not.toBeInTheDocument()
  })

  it('links back to the project history', () => {
    useMeetingMock.mockReturnValue({ data: makeMeeting(), isLoading: false, error: null })
    renderAt('/meetings/src-1')
    expect(screen.getByRole('link', { name: 'Back to project' })).toHaveAttribute('href', '/projects/proj-1#history')
  })

  it('shows an error when the meeting cannot be loaded', () => {
    useMeetingMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('Source not found') })
    renderAt('/meetings/missing')
    expect(screen.getByText('Meeting not available')).toBeInTheDocument()
    expect(screen.getByText('Source not found')).toBeInTheDocument()
  })
})

describe('MeetingViewer visibility (Story 12.4)', () => {
  beforeEach(() => {
    useMeetingMock.mockReset()
    mockedApi.patch.mockReset()
    Element.prototype.scrollTo = vi.fn()
  })

  it('shows the badge without a switch for users who cannot change it', () => {
    useMeetingMock.mockReturnValue({
      data: makeMeeting({ visibility: 'shared', can_change_visibility: false }),
      isLoading: false,
      error: null,
    })
    renderAt('/meetings/src-1')
    expect(screen.getByTestId('visibility-badge')).toHaveTextContent('Shared')
    expect(screen.queryByRole('button', { name: /make internal|share with the project/i })).not.toBeInTheDocument()
  })

  it('shares an internal meeting only after confirmation', async () => {
    useMeetingMock.mockReturnValue({
      data: makeMeeting({ visibility: 'internal', can_change_visibility: true }),
      isLoading: false,
      error: null,
    })
    mockedApi.patch.mockResolvedValue({ data: { id: 'src-1', visibility: 'shared' } })
    const user = userEvent.setup()
    renderAt('/meetings/src-1')

    expect(screen.getByTestId('visibility-badge')).toHaveTextContent('Internal')
    await user.click(screen.getByRole('button', { name: 'Share with the project' }))
    expect(mockedApi.patch).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Every organization on the project will see this meeting')

    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(mockedApi.patch).toHaveBeenCalledWith('/sources/src-1/visibility', { visibility: 'shared' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('cancelling the confirmation changes nothing', async () => {
    useMeetingMock.mockReturnValue({
      data: makeMeeting({ visibility: 'shared', can_change_visibility: true }),
      isLoading: false,
      error: null,
    })
    const user = userEvent.setup()
    renderAt('/meetings/src-1')

    await user.click(screen.getByRole('button', { name: 'Make internal' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Only your organization will see this meeting')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(mockedApi.patch).not.toHaveBeenCalled()
  })

  it('shows an error when the change fails', async () => {
    useMeetingMock.mockReturnValue({
      data: makeMeeting({ visibility: 'internal', can_change_visibility: true }),
      isLoading: false,
      error: null,
    })
    mockedApi.patch.mockRejectedValue(new Error('403'))
    const user = userEvent.setup()
    renderAt('/meetings/src-1')

    await user.click(screen.getByRole('button', { name: 'Share with the project' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not change the visibility.')
  })

  it('renders the Portuguese labels', async () => {
    await i18n.changeLanguage('pt-BR')
    try {
      useMeetingMock.mockReturnValue({
        data: makeMeeting({ visibility: 'internal', can_change_visibility: true }),
        isLoading: false,
        error: null,
      })
      renderAt('/meetings/src-1')
      expect(screen.getByTestId('visibility-badge')).toHaveTextContent('Interna')
      expect(screen.getByRole('button', { name: 'Compartilhar com o projeto' })).toBeInTheDocument()
    } finally {
      await i18n.changeLanguage('en')
    }
  })
})
