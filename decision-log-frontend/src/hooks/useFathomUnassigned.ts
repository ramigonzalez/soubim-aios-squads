/**
 * Fathom webhook meetings that wait for a project (Story 13.9), shown as rows of the Ingestão
 * Pendentes table (Story 13.16).
 */
import { useQuery } from 'react-query'
import { integrationsService } from '../services/integrationsService'
import type { FathomUnassignedMeeting } from '../types/integrations'
import type { IngestionFilters } from '../types/ingestion'

export const FATHOM_UNASSIGNED_KEY = 'fathom-unassigned'

export function useFathomUnassigned() {
  return useQuery(FATHOM_UNASSIGNED_KEY, integrationsService.listFathomUnassigned, {
    retry: false,
    refetchInterval: 30_000, // webhook meetings appear without a reload
  })
}

/** Date used for sorting and the date filters: the meeting start, else when it arrived */
export function unassignedDate(item: FathomUnassignedMeeting): string {
  return item.started_at || item.received_at || ''
}

/**
 * Same filters as the sources: they are meetings (the "Meeting" type filter keeps them) and have no
 * project, so a project filter hides them — they show only under "All projects".
 */
export function filterUnassigned(
  items: FathomUnassignedMeeting[] | undefined,
  filters: IngestionFilters,
): FathomUnassignedMeeting[] {
  if (!items) return []
  if (filters.project_id) return []
  if (filters.source_type && filters.source_type !== 'meeting') return []
  return items.filter((item) => {
    const day = unassignedDate(item).split('T')[0]
    if (filters.date_from && (!day || day < filters.date_from)) return false
    if (filters.date_to && (!day || day > filters.date_to)) return false
    return true
  })
}
