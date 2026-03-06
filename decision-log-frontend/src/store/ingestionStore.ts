import { create } from 'zustand'
import type { IngestionFilters } from '../types/ingestion'

type IngestionTab = 'pending' | 'history'

interface IngestionStore {
  activeTab: IngestionTab
  selectedIds: Set<string>
  filters: IngestionFilters
  deleteConfirmId: string | null
  setActiveTab: (tab: IngestionTab) => void
  toggleSelected: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  setFilter: (key: keyof IngestionFilters, value: string | null) => void
  clearFilters: () => void
  setDeleteConfirmId: (id: string | null) => void
}

const defaultFilters: IngestionFilters = {
  project_id: null,
  source_type: null,
  date_from: null,
  date_to: null,
}

export const useIngestionStore = create<IngestionStore>((set) => ({
  activeTab: 'pending',
  selectedIds: new Set(),
  filters: { ...defaultFilters },
  deleteConfirmId: null,

  setActiveTab: (tab) => set({ activeTab: tab, selectedIds: new Set() }),

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

  setDeleteConfirmId: (id) => set({ deleteConfirmId: id }),
}))
