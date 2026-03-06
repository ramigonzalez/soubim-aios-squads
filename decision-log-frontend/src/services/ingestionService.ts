import api from './api'
import type {
  IngestionResponse,
  IngestionHistoryResponse,
  BatchActionPayload,
  BatchActionResponse,
  DeleteSourceResponse,
} from '../types/ingestion'

export const ingestionService = {
  getSources: (): Promise<IngestionResponse> =>
    api.get('/ingestion').then(r => r.data),

  getHistory: (): Promise<IngestionHistoryResponse> =>
    api.get('/ingestion/history').then(r => r.data),

  approveSource: (sourceId: string): Promise<void> =>
    api.patch(`/ingestion/${sourceId}`, { ingestion_status: 'approved' }).then(r => r.data),

  rejectSource: (sourceId: string): Promise<void> =>
    api.patch(`/ingestion/${sourceId}`, { ingestion_status: 'rejected' }).then(r => r.data),

  retrySource: (sourceId: string): Promise<void> =>
    api.post(`/ingestion/${sourceId}/retry`).then(r => r.data),

  deleteSource: (sourceId: string): Promise<DeleteSourceResponse> =>
    api.delete(`/ingestion/${sourceId}`).then(r => r.data),

  batchAction: (payload: BatchActionPayload): Promise<BatchActionResponse> =>
    api.post('/ingestion/batch', payload).then(r => r.data),

  getPendingCount: (): Promise<{ pending: number }> =>
    api.get('/ingestion/count').then(r => r.data),
}
