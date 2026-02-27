import api from './api'
import type { IngestionResponse, BatchActionPayload, BatchActionResponse } from '../types/ingestion'

export const ingestionService = {
  getSources: (): Promise<IngestionResponse> =>
    api.get('/ingestion').then(r => r.data),

  updateSource: (sourceId: string, included: boolean): Promise<void> =>
    api.patch(`/ingestion/${sourceId}`, { included }).then(r => r.data),

  batchAction: (payload: BatchActionPayload): Promise<BatchActionResponse> =>
    api.post('/ingestion/batch', payload).then(r => r.data),

  getPendingCount: (): Promise<{ pending: number }> =>
    api.get('/ingestion/count').then(r => r.data),
}
