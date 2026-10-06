import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExtractionVersions from '../../components/organisms/ExtractionVersions'
import type { ExtractionRunsResponse } from '../../hooks/useExtractionRuns'

const activate = vi.fn()
const reExtract = vi.fn()
const runsMock = vi.fn()

vi.mock('../../hooks/useExtractionRuns', () => ({
  useExtractionRuns: () => runsMock(),
  useActivateExtractionRun: () => ({ mutate: activate, isLoading: false, isError: false, variables: undefined }),
  useReExtract: () => ({ mutate: reExtract, isLoading: false, isError: false }),
}))

const run = (version: number, active: boolean, items: number) => ({
  id: `run-${version}`,
  version,
  model: `model-${version}`,
  prompt_version: 'abc',
  status: 'completed',
  is_active: active,
  created_at: '2026-10-06T10:00:00',
  created_by_name: 'Admin',
  input_tokens: 1000,
  output_tokens: 500,
  item_count: items,
  counts_by_type: { decision: items },
})

function respond(overrides: Partial<ExtractionRunsResponse> = {}) {
  runsMock.mockReturnValue({
    isLoading: false,
    isError: false,
    data: { source_id: 's1', can_manage: true, runs: [run(2, true, 5), run(1, false, 3)], latest_job: null, ...overrides },
  })
}

describe('ExtractionVersions (Story 13.7)', () => {
  beforeEach(() => {
    activate.mockReset()
    reExtract.mockReset()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('lists the versions with model, item count and the active mark', async () => {
    respond()
    render(<ExtractionVersions sourceId="s1" />)
    await userEvent.click(screen.getByRole('button', { name: /Versions \(2\)/ }))

    expect(screen.getByText('Version 2')).toBeInTheDocument()
    expect(screen.getByText('model-1')).toBeInTheDocument()
    expect(screen.getByText('5 items')).toBeInTheDocument()
    expect(screen.getAllByText('Active')).toHaveLength(1)
  })

  it('an admin switches to another version after confirming', async () => {
    respond()
    render(<ExtractionVersions sourceId="s1" />)
    await userEvent.click(screen.getByRole('button', { name: /Versions/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Use this version' }))

    expect(window.confirm).toHaveBeenCalled()
    expect(activate).toHaveBeenCalledWith('run-1')
  })

  it('does not switch when the confirmation is declined', async () => {
    respond()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ExtractionVersions sourceId="s1" />)
    await userEvent.click(screen.getByRole('button', { name: /Versions/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Use this version' }))

    expect(activate).not.toHaveBeenCalled()
  })

  it('an admin can extract again', async () => {
    respond()
    render(<ExtractionVersions sourceId="s1" />)
    await userEvent.click(screen.getByRole('button', { name: /Versions/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Extract again' }))

    expect(reExtract).toHaveBeenCalled()
  })

  it('readers see the list without actions', async () => {
    respond({ can_manage: false })
    render(<ExtractionVersions sourceId="s1" />)
    await userEvent.click(screen.getByRole('button', { name: /Versions/ }))

    expect(screen.getByText('Version 1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Use this version' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Extract again' })).not.toBeInTheDocument()
  })

  it('shows a running extraction and a failed one', async () => {
    respond({ latest_job: { type: 'process_source', status: 'running', last_error: null } })
    const { unmount } = render(<ExtractionVersions sourceId="s1" />)
    await userEvent.click(screen.getByRole('button', { name: /Versions/ }))
    expect(screen.getByRole('button', { name: 'Extraction in progress…' })).toBeDisabled()
    unmount()

    respond({ latest_job: { type: 'process_source', status: 'failed', last_error: 'cut off' } })
    render(<ExtractionVersions sourceId="s1" />)
    await userEvent.click(screen.getByRole('button', { name: /Versions/ }))
    expect(screen.getByText(/cut off/)).toBeInTheDocument()
  })
})
