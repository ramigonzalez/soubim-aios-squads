import { useQuery } from 'react-query'
import { ingestionService } from '../services/ingestionService'
import type { Source, IngestionFilters } from '../types/ingestion'

export function useIngestion() {
  return useQuery('ingestion', ingestionService.getSources, {
    staleTime: 30_000,
  })
}

export function usePendingCount() {
  return useQuery('ingestion-pending-count', ingestionService.getPendingCount, {
    staleTime: 30_000,
  })
}

export function useFilteredSources(
  sources: Source[] | undefined,
  filters: IngestionFilters
): Source[] {
  if (!sources) return []
  return sources.filter((s) => {
    if (filters.project_id && s.project_id !== filters.project_id) return false
    if (filters.source_type && s.source_type !== filters.source_type) return false
    const sourceDate = getSourceDate(s)
    if (filters.date_from && sourceDate < filters.date_from) return false
    if (filters.date_to && sourceDate > filters.date_to) return false
    return true
  })
}

function getSourceDate(source: Source): string {
  switch (source.source_type) {
    case 'meeting': return source.meeting_date.split('T')[0]
    case 'email': return source.email_date.split('T')[0]
    case 'document': return source.upload_date.split('T')[0]
  }
}
