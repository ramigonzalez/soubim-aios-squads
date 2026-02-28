/**
 * DocumentUploadButton — Upload PDF or DOCX files for a project.
 *
 * Story 10.2: Document Ingestion (PDF & DOCX)
 *
 * Renders a button that opens a file picker, uploads the selected document
 * via multipart POST to the backend, and shows upload status inline.
 */

import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { useState, useRef } from 'react'
import api from '../../services/api'

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

interface DocumentUploadButtonProps {
  projectId: string
  onUploadComplete?: () => void
}

export function DocumentUploadButton({ projectId, onUploadComplete }: DocumentUploadButtonProps) {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    setStatus('uploading')
    setErrorMessage('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      await api.post(`/projects/${projectId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setStatus('success')
      onUploadComplete?.()

      // Reset to idle after 3 seconds
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err: unknown) {
      setStatus('error')
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
            'Upload failed'
          : 'Upload failed — network error'
      setErrorMessage(message)
      console.error('Document upload failed:', err)

      // Reset to idle after 5 seconds
      setTimeout(() => setStatus('idle'), 5000)
    } finally {
      // Clear file input so the same file can be re-selected
      if (fileRef.current) {
        fileRef.current.value = ''
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={() => fileRef.current?.click()}
        disabled={status === 'uploading'}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                   border border-gray-200 rounded-md hover:bg-gray-50
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
        aria-label="Upload document"
      >
        {status === 'uploading' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : status === 'success' ? (
          <CheckCircle className="w-4 h-4 text-green-600" />
        ) : status === 'error' ? (
          <XCircle className="w-4 h-4 text-red-600" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {status === 'uploading'
          ? 'Uploading...'
          : status === 'success'
            ? 'Uploaded!'
            : status === 'error'
              ? 'Failed'
              : 'Upload Document'}
      </button>

      {status === 'error' && errorMessage && (
        <span className="text-xs text-red-600 max-w-48 truncate" title={errorMessage}>
          {errorMessage}
        </span>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={handleFileChange}
        data-testid="document-file-input"
      />
    </div>
  )
}
