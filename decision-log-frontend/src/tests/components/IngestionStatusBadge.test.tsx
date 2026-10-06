import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import IngestionStatusBadge from '../../components/molecules/IngestionStatusBadge'
import i18n from '../../i18n'
import type { SourceJob } from '../../types/ingestion'

function job(overrides: Partial<SourceJob> = {}): SourceJob {
  return { status: 'queued', attempts: 0, max_attempts: 3, run_after: null, last_error: null, ...overrides }
}

describe('IngestionStatusBadge — processing state (Story 13.2)', () => {
  afterEach(() => i18n.changeLanguage('en'))

  it('shows the plain status when there is no job', () => {
    render(<IngestionStatusBadge status="processed" />)
    expect(screen.getByText('processed')).toBeInTheDocument()
  })

  it('shows Queued for an approved source waiting for the worker', () => {
    render(<IngestionStatusBadge status="approved" job={job()} />)
    expect(screen.getByText('Queued')).toBeInTheDocument()
  })

  it('shows Processing while the worker runs it', () => {
    render(<IngestionStatusBadge status="approved" job={job({ status: 'running', attempts: 1 })} />)
    expect(screen.getByText('Processing')).toBeInTheDocument()
  })

  it('shows the next attempt and the last error while waiting to retry', () => {
    render(<IngestionStatusBadge status="approved" job={job({ attempts: 1, last_error: 'API overloaded' })} />)
    const badge = screen.getByText('Retrying (2/3)')
    expect(badge).toHaveAttribute('title', 'API overloaded')
  })

  it('ignores the job once the source is processed or failed', () => {
    render(<IngestionStatusBadge status="failed" job={job({ status: 'failed', attempts: 3 })} />)
    expect(screen.getByText('failed')).toBeInTheDocument()
  })

  it('is translated to Portuguese', async () => {
    await i18n.changeLanguage('pt-BR')
    render(<IngestionStatusBadge status="approved" job={job({ status: 'running', attempts: 1 })} />)
    expect(screen.getByText('Processando')).toBeInTheDocument()
  })
})
