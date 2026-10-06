import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from 'react-query'
import { AddMeetingDialog } from '../../components/organisms/AddMeetingDialog'
import { uploadService } from '../../services/uploadService'

vi.mock('../../services/uploadService', () => ({
  uploadService: { getProjects: vi.fn(), presign: vi.fn(), putVideo: vi.fn(), complete: vi.fn() },
}))
const svc = vi.mocked(uploadService)

const TARGET = {
  source_id: 'src-9',
  video_extension: '.mp4',
  upload_token: 'tok-1',
  upload_url: 'https://storage.test/x',
  method: 'PUT' as const,
  headers: { 'Content-Type': 'video/mp4' },
  expires_in: 60,
  max_bytes: 100,
}

function renderDialog(onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <AddMeetingDialog open onClose={onClose} />
    </QueryClientProvider>
  )
  return onClose
}

async function fillCommon(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('option', { name: 'Obra X' })
  await user.selectOptions(screen.getByLabelText('Project'), 'p1')
  await user.type(screen.getByLabelText('Title'), 'Visita')
}

describe('AddMeetingDialog (Story 13.5)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    svc.getProjects.mockResolvedValue([{ id: 'p1', name: 'Obra X' }])
    svc.complete.mockResolvedValue({ id: 'src-9', project_id: 'p1', title: 'Visita' })
  })

  it('needs a project, a title and a file before it can submit', async () => {
    const user = userEvent.setup()
    renderDialog()
    const submit = screen.getByRole('button', { name: 'Add meeting' })
    expect(submit).toBeDisabled()
    await fillCommon(user)
    expect(submit).toBeDisabled()
    await user.upload(screen.getByLabelText(/Transcript/), new File(['texto'], 'ata.txt', { type: 'text/plain' }))
    await waitFor(() => expect(submit).toBeEnabled())
  })

  it('transcript only: no presign, text goes to complete', async () => {
    const user = userEvent.setup()
    const onClose = renderDialog()
    await fillCommon(user)
    await user.upload(screen.getByLabelText(/Transcript/), new File(['0:05 - Ana\n  Oi.'], 'ata.txt', { type: 'text/plain' }))
    const submit = screen.getByRole('button', { name: 'Add meeting' })
    await waitFor(() => expect(submit).toBeEnabled())
    await user.click(submit)
    await waitFor(() => expect(svc.complete).toHaveBeenCalled())
    expect(svc.presign).not.toHaveBeenCalled()
    expect(svc.complete.mock.calls[0][0]).toMatchObject({
      project_id: 'p1', title: 'Visita', transcript: '0:05 - Ana\n  Oi.', source_id: null,
    })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('video: presigns, uploads with progress, then completes', async () => {
    const user = userEvent.setup()
    svc.presign.mockResolvedValue(TARGET)
    svc.putVideo.mockImplementation(async (_t, _f, onProgress) => onProgress(0.5))
    const onClose = renderDialog()
    await fillCommon(user)
    await user.upload(screen.getByLabelText(/Video/), new File(['mp4'], 'obra.mp4', { type: 'video/mp4' }))
    await user.click(screen.getByRole('button', { name: 'Add meeting' }))
    await waitFor(() => expect(svc.complete).toHaveBeenCalled())
    expect(svc.presign).toHaveBeenCalledWith({ project_id: 'p1', filename: 'obra.mp4', size: 3 })
    expect(svc.complete.mock.calls[0][0]).toMatchObject({ source_id: 'src-9', video_extension: '.mp4', upload_token: 'tok-1', transcript: null })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('rejects an unsupported video before uploading', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderDialog()
    await screen.findByRole('option', { name: 'Obra X' })
    await user.upload(screen.getByLabelText(/Video/), new File(['x'], 'obra.avi'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Unsupported video type')
    expect(svc.presign).not.toHaveBeenCalled()
  })

  it('shows the storage error from a 503 and offers a retry', async () => {
    const user = userEvent.setup()
    svc.presign.mockRejectedValue({ response: { status: 503 } })
    renderDialog()
    await fillCommon(user)
    await user.upload(screen.getByLabelText(/Video/), new File(['mp4'], 'obra.mp4'))
    await user.click(screen.getByRole('button', { name: 'Add meeting' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Video storage is not configured')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
    expect(svc.complete).not.toHaveBeenCalled()
  })
})
