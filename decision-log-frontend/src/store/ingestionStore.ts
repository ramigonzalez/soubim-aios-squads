import { create } from 'zustand'
import type { IngestionFilters } from '../types/ingestion'

interface IngestionStore {
  selectedIds: Set<string>
  filters: IngestionFilters
  toggleSelected: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  setFilter: (key: keyof IngestionFilters, value: string | null) => void
  clearFilters: () => void
}

const defaultFilters: IngestionFilters = {
  project_id: null,
  source_type: null,
  date_from: null,
  date_to: null,
}

export const useIngestionStore = create<IngestionStore>((set) => ({
  selectedIds: new Set(),
  filters: { ...defaultFilters },

  toggleSelected: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { selectedIds: next }
    }),

  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() }),

  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),

  clearFilters: () => set({ filters: { ...defaultFilters } }),
}))
