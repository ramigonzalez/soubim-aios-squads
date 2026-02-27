/**
 * Custom hook to fetch project items (V2) with filtering and pagination.
 * Story 5.3: Frontend Types & Hooks Migration
 */
import { useQuery } from 'react-query'
import api from '../services/api'
import { ProjectItemsResponse } from '../types/projectItem'
import { useFilterStore } from '../store/filterStore'

interface UseProjectItemsOptions {
  projectId: string
  limit?: number
  offset?: number
}

export function useProjectItems({
  projectId,
  limit = 50,
  offset = 0,
}: UseProjectItemsOptions) {
  const {
    disciplines,
    dateFrom,
    dateTo,
    searchQuery,
    itemTypes,
    sourceTypes,
  } = useFilterStore()

  return useQuery<ProjectItemsResponse, Error>(
    [
      'projectItems',
      projectId,
      { disciplines, dateFrom, dateTo, searchQuery, itemTypes, sourceTypes, limit, offset },
    ],
    async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })

      if (itemTypes.length > 0) {
        params.append('item_type', itemTypes.join(','))
      }

      if (sourceTypes.length > 0) {
        params.append('source_type', sourceTypes.join(','))
      }

      if (disciplines.length > 0) {
        params.append('discipline', disciplines.join(','))
      }

      if (dateFrom) {
        params.append('date_from', dateFrom)
      }

      if (dateTo) {
        params.append('date_to', dateTo)
      }

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await api.get<ProjectItemsResponse>(
        `/projects/${projectId}/items?${params}`
      )
      return response.data
    },
    {
      enabled: !!projectId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    }
  )
}
