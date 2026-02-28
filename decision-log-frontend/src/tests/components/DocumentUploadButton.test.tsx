/**
 * Tests for DocumentUploadButton component.
 *
 * Story 10.2: Document Ingestion (PDF & DOCX)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentUploadButton } from '../../components/molecules/DocumentUploadButton'

// Mock the api module
vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

import api from '../../services/api'

const mockedApi = vi.mocked(api)

describe('DocumentUploadButton', () => {
  const projectId = 'test-project-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders upload button with correct text', () => {
    render(<DocumentUploadButton projectId={projectId} />)
    const button = screen.getByRole('button', { name: /upload document/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Upload Document')
  })

  it('renders upload icon (svg element)', () => {
    const { container } = render(<DocumentUploadButton projectId={projectId} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('has a hidden file input accepting .pdf and .docx', () => {
    render(<DocumentUploadButton projectId={projectId} />)
    const input = screen.getByTestId('document-file-input') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.type).toBe('file')
    expect(input.accept).toBe('.pdf,.docx')
    expect(input.className).toContain('hidden')
  })

  it('opens file picker when button is clicked', async () => {
    const user = userEvent.setup()
    render(<DocumentUploadButton projectId={projectId} />)

    const input = screen.getByTestId('document-file-input') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')

    const button = screen.getByRole('button', { name: /upload document/i })
    await user.click(button)

    expect(clickSpy).toHaveBeenCalled()
  })

  it('shows uploading state during upload', async () => {
    const user = userEvent.setup()

    // Make the API call hang
    mockedApi.post.mockReturnValue(new Promise(() => {}))

    render(<DocumentUploadButton projectId={projectId} />)

    const input = screen.getByTestId('document-file-input')
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument()
    })

    // Button should be disabled during upload
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('shows success state after successful upload', async () => {
    const user = userEvent.setup()
    const onUploadComplete = vi.fn()

    mockedApi.post.mockResolvedValue({
      data: { source_id: 'src-1', status: 'pending', ai_summary: 'Test summary' },
    })

    render(
      <DocumentUploadButton projectId={projectId} onUploadComplete={onUploadComplete} />
    )

    const input = screen.getByTestId('document-file-input')
    const file = new File(['test content'], 'report.pdf', { type: 'application/pdf' })

    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText('Uploaded!')).toBeInTheDocument()
    })

    expect(onUploadComplete).toHaveBeenCalled()
  })

  it('calls API with correct FormData and headers', async () => {
    const user = userEvent.setup()

    mockedApi.post.mockResolvedValue({ data: { source_id: 'src-1' } })

    render(<DocumentUploadButton projectId={projectId} />)

    const input = screen.getByTestId('document-file-input')
    const file = new File(['test content'], 'spec.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    await user.upload(input, file)

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        `/projects/${projectId}/documents`,
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
    })
  })

  it('shows error state on upload failure', async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockedApi.post.mockRejectedValue({
      response: { data: { detail: 'Only PDF and DOCX files are supported' } },
    })

    render(<DocumentUploadButton projectId={projectId} />)

    const input = screen.getByTestId('document-file-input')
    const file = new File(['test'], 'bad.pdf', { type: 'application/pdf' })

    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  it('button is not disabled in idle state', () => {
    render(<DocumentUploadButton projectId={projectId} />)
    const button = screen.getByRole('button', { name: /upload document/i })
    expect(button).not.toBeDisabled()
  })
})
