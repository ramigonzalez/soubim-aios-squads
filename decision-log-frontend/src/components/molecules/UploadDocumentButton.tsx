/**
 * "Enviar documento" (PDF/DOCX) in the project header (Story 10.2, restyled).
 * The document enters the Ingestão; success and errors are toasts with "Tentar de novo".
 */
import { useRef, useState } from 'react'
import { useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Button, Icons, useToast } from '../../design-system'
import api from '../../services/api'

export function UploadDocumentButton({ projectId }: { projectId: string }) {
  const { t } = useTranslation('project')
  const toast = useToast()
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const Upload = Icons.upload

  const upload = async (file: File) => {
    setBusy(true)
    const form = new FormData()
    form.append('file', file)
    try {
      await api.post(`/projects/${projectId}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.show({ message: t('header.uploaded'), tone: 'success' })
      void queryClient.invalidateQueries('ingestion')
      void queryClient.invalidateQueries('ingestion-pending-count')
    } catch {
      toast.show({ message: t('header.uploadError'), tone: 'error', onRetry: () => void upload(file) })
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <>
      <Button icon={<Upload />} loading={busy} onClick={() => input.current?.click()}>
        {busy ? t('header.uploading') : t('header.upload')}
      </Button>
      <input
        ref={input}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        data-testid="upload-document-input"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
        }}
      />
    </>
  )
}
