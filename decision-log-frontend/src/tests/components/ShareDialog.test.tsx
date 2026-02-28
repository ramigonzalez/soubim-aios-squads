/**
 * Tests for ShareDialog component (Story 8.4).
 *
 * Covers: generate link, copy to clipboard, revoke with confirmation,
 * view count display, and loading states.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ShareDialog } from '../../components/molecules/ShareDialog'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockShareLinks = vi.fn()
const mockCreateShareLink = vi.fn()
const mockRevokeShareLink = vi.fn()

vi.mock('../../hooks/useSharedLinks', () => ({
  useShareLinks: (projectId: string) => mockShareLinks(projectId),
  useCreateShareLink: (projectId: string) => {
    const result = mockCreateShareLink(projectId)
    return {
      mutateAsync: result.mutateAsync || vi.fn(),
      isLoading: result.isLoading || false,
    }
  },
  useRevokeShareLink: (projectId: string) => {
    const result = mockRevokeShareLink(projectId)
    return {
      mutateAsync: result.mutateAsync || vi.fn(),
      isLoading: result.isLoading || false,
    }
  },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderShareDialog(props?: Partial<{ projectId: string; open: boolean; onOpenChange: (v: boolean) => void }>) {
  const queryClient = createQueryClient()
  const defaultProps = {
    projectId: 'project-123',
    open: true,
    onOpenChange: vi.fn(),
    ...props,
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <ShareDialog {...defaultProps} />
    </QueryClientProvider>
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ShareDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: no active links, not loading
    mockShareLinks.mockReturnValue({
      data: { links: [] },
      isLoading: false,
    })
    mockCreateShareLink.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        share_token: 'new-token-123',
        share_url: '/shared/milestones/new-token-123',
        expires_at: '2026-03-30T00:00:00Z',
      }),
      isLoading: false,
    })
    mockRevokeShareLink.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ message: 'Link revoked successfully' }),
      isLoading: false,
    })
  })

  it('renders dialog title', () => {
    renderShareDialog()
    expect(screen.getByText('Share Milestone Timeline')).toBeInTheDocument()
  })

  it('renders "Generate Link" button when no active link exists', () => {
    renderShareDialog()
    expect(screen.getByText('Generate Link')).toBeInTheDocument()
  })

  it('calls createShareLink when Generate Link is clicked', async () => {
    const user = userEvent.setup()
    const mutateFn = vi.fn().mockResolvedValue({})
    mockCreateShareLink.mockReturnValue({
      mutateAsync: mutateFn,
      isLoading: false,
    })

    renderShareDialog()
    await user.click(screen.getByText('Generate Link'))
    expect(mutateFn).toHaveBeenCalledWith(30)
  })

  it('shows active link URL when a link exists', () => {
    mockShareLinks.mockReturnValue({
      data: {
        links: [
          {
            share_token: 'abc-token-456',
            created_at: '2026-02-28T00:00:00Z',
            expires_at: '2026-03-30T00:00:00Z',
            view_count: 5,
            resource_type: 'milestone_timeline',
          },
        ],
      },
      isLoading: false,
    })

    renderShareDialog()
    expect(screen.getByText(/abc-token-456/)).toBeInTheDocument()
  })

  it('shows view count when link exists', () => {
    mockShareLinks.mockReturnValue({
      data: {
        links: [
          {
            share_token: 'abc-token-456',
            created_at: '2026-02-28T00:00:00Z',
            expires_at: '2026-03-30T00:00:00Z',
            view_count: 12,
            resource_type: 'milestone_timeline',
          },
        ],
      },
      isLoading: false,
    })

    renderShareDialog()
    expect(screen.getByText(/Viewed 12 times/)).toBeInTheDocument()
  })

  it('shows singular "time" for view_count of 1', () => {
    mockShareLinks.mockReturnValue({
      data: {
        links: [
          {
            share_token: 'abc-token-456',
            created_at: '2026-02-28T00:00:00Z',
            expires_at: '2026-03-30T00:00:00Z',
            view_count: 1,
            resource_type: 'milestone_timeline',
          },
        ],
      },
      isLoading: false,
    })

    renderShareDialog()
    expect(screen.getByText(/Viewed 1 time$/)).toBeInTheDocument()
  })

  it('shows expiration date', () => {
    mockShareLinks.mockReturnValue({
      data: {
        links: [
          {
            share_token: 'abc-token-456',
            created_at: '2026-02-28T12:00:00Z',
            expires_at: '2026-03-30T12:00:00Z',
            view_count: 0,
            resource_type: 'milestone_timeline',
          },
        ],
      },
      isLoading: false,
    })

    renderShareDialog()
    // Verify the expiration date is displayed (exact format depends on locale/timezone)
    expect(screen.getByText(/Expires on/)).toBeInTheDocument()
    expect(screen.getByText(/Mar 30, 2026/)).toBeInTheDocument()
  })

  it('copy button copies URL to clipboard', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    })

    mockShareLinks.mockReturnValue({
      data: {
        links: [
          {
            share_token: 'copy-test-token',
            created_at: '2026-02-28T00:00:00Z',
            expires_at: '2026-03-30T00:00:00Z',
            view_count: 0,
            resource_type: 'milestone_timeline',
          },
        ],
      },
      isLoading: false,
    })

    renderShareDialog()
    const copyButton = screen.getByLabelText('Copy link')
    await user.click(copyButton)

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('/shared/milestones/copy-test-token')
    )
  })

  it('shows "Copied" text after clicking copy', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    })

    mockShareLinks.mockReturnValue({
      data: {
        links: [
          {
            share_token: 'copy-test-token',
            created_at: '2026-02-28T00:00:00Z',
            expires_at: '2026-03-30T00:00:00Z',
            view_count: 0,
            resource_type: 'milestone_timeline',
          },
        ],
      },
      isLoading: false,
    })

    renderShareDialog()
    const copyButton = screen.getByLabelText('Copy link')
    await user.click(copyButton)

    await waitFor(() => {
      expect(screen.getByText('Copied')).toBeInTheDocument()
    })
  })

  it('revoke button shows confirmation', async () => {
    const user = userEvent.setup()

    mockShareLinks.mockReturnValue({
      data: {
        links: [
          {
            share_token: 'revoke-test-token',
            created_at: '2026-02-28T00:00:00Z',
            expires_at: '2026-03-30T00:00:00Z',
            view_count: 3,
            resource_type: 'milestone_timeline',
          },
        ],
      },
      isLoading: false,
    })

    renderShareDialog()
    const revokeButton = screen.getByText('Revoke Link')
    await user.click(revokeButton)

    expect(screen.getByText('Are you sure? This will immediately invalidate the shared link.')).toBeInTheDocument()
    expect(screen.getByText('Yes, revoke')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('confirming revoke calls revokeShareLink', async () => {
    const user = userEvent.setup()
    const revokeFn = vi.fn().mockResolvedValue({})

    mockShareLinks.mockReturnValue({
      data: {
        links: [
          {
            share_token: 'revoke-test-token',
            created_at: '2026-02-28T00:00:00Z',
            expires_at: '2026-03-30T00:00:00Z',
            view_count: 3,
            resource_type: 'milestone_timeline',
          },
        ],
      },
      isLoading: false,
    })
    mockRevokeShareLink.mockReturnValue({
      mutateAsync: revokeFn,
      isLoading: false,
    })

    renderShareDialog()
    await user.click(screen.getByText('Revoke Link'))
    await user.click(screen.getByText('Yes, revoke'))

    expect(revokeFn).toHaveBeenCalledWith('revoke-test-token')
  })

  it('cancel button hides confirmation', async () => {
    const user = userEvent.setup()

    mockShareLinks.mockReturnValue({
      data: {
        links: [
          {
            share_token: 'cancel-test-token',
            created_at: '2026-02-28T00:00:00Z',
            expires_at: '2026-03-30T00:00:00Z',
            view_count: 0,
            resource_type: 'milestone_timeline',
          },
        ],
      },
      isLoading: false,
    })

    renderShareDialog()
    await user.click(screen.getByText('Revoke Link'))
    expect(screen.getByText('Yes, revoke')).toBeInTheDocument()

    await user.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Yes, revoke')).not.toBeInTheDocument()
  })

  it('shows loading spinner when data is loading', () => {
    mockShareLinks.mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    renderShareDialog()
    // Should not show generate or link content while loading
    expect(screen.queryByText('Generate Link')).not.toBeInTheDocument()
  })
})
