/**
 * Manual upload API (Story 13.5). The video goes straight to storage with a signed PUT;
 * only metadata and the transcript text pass through the API.
 */
import axios from 'axios'
import api from './api'

export interface UploadProject {
  id: string
  name: string
}

export interface PresignedUpload {
  source_id: string
  video_extension: string
  upload_url: string
  method: 'PUT'
  headers: Record<string, string>
  expires_in: number
  max_bytes: number
}

export interface CompleteUploadBody {
  project_id: string
  title: string
  occurred_at: string
  participants: string[]
  transcript?: string | null
  source_id?: string | null
  video_extension?: string | null
}

export const uploadService = {
  getProjects: (): Promise<UploadProject[]> => api.get('/uploads/projects').then(r => r.data),

  presign: (body: { project_id: string; filename: string; size: number }): Promise<PresignedUpload> =>
    api.post('/uploads/presign', body).then(r => r.data),

  /** PUT the file to the signed URL (a bare axios call: no API Bearer header on a storage request). */
  putVideo: (
    target: PresignedUpload,
    file: File,
    onProgress: (fraction: number) => void,
    signal?: AbortSignal,
  ): Promise<void> =>
    axios
      .put(target.upload_url, file, {
        headers: target.headers,
        signal,
        onUploadProgress: e => onProgress(e.total ? e.loaded / e.total : 0),
      })
      .then(() => undefined),

  complete: (body: CompleteUploadBody): Promise<{ id: string; project_id: string; title: string }> =>
    api.post('/uploads/complete', body).then(r => r.data),
}
