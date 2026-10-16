/** Promem revamp Phase 4d: GET /search (projects, items, meetings the user can see). */
import { useQuery } from 'react-query'
import api from '../services/api'
import type { ItemType, SourceType } from '../types/projectItem'

export interface SearchResults {
  query: string
  projects: { id: string; name: string; description: string | null; archived: boolean }[]
  items: {
    id: string
    project_id: string
    project_name: string
    title: string | null
    statement: string
    item_type: ItemType
    source_type: SourceType
    is_milestone: boolean
    is_done: boolean
    affected_disciplines: string[]
    date: string | null
  }[]
  meetings: { id: string; project_id: string; project_name: string; title: string | null; occurred_at: string | null }[]
  more: { projects: boolean; items: boolean; meetings: boolean }
}

export const SEARCH_MIN = 2

export function useGlobalSearch(query: string) {
  const q = query.trim()
  return useQuery<SearchResults, Error>(['search', q], async () => (await api.get<SearchResults>('/search', { params: { q } })).data, {
    enabled: q.length >= SEARCH_MIN,
    staleTime: 30_000,
    keepPreviousData: true,
  })
}
