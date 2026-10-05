import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MeetingViewer } from '../../pages/MeetingViewer'
import type { Meeting } from '../../hooks/useMeeting'

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
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/meetings/:sourceId" element={<MeetingViewer />} />
      </Routes>
    </MemoryRouter>
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
