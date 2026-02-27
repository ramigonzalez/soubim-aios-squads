import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FilterState {
  // V1 Filters (preserved for backward compat)
  disciplines: string[]
  decisionMakers: string[]
  meetingTypes: string[]
  dateFrom: string | null
  dateTo: string | null
  searchQuery: string

  // V2 Filters (Story 5.3)
  itemTypes: string[]
  sourceTypes: string[]

  // V1 Actions
  setDisciplines: (disciplines: string[]) => void
  setDecisionMakers: (names: string[]) => void
  setMeetingTypes: (types: string[]) => void
  setDateRange: (from: string | null, to: string | null) => void
  setSearchQuery: (query: string) => void
  toggleDiscipline: (discipline: string) => void
  toggleDecisionMaker: (name: string) => void
  toggleMeetingType: (type: string) => void
  clearDisciplines: () => void
  clearDecisionMakers: () => void
  clearMeetingTypes: () => void

  // V2 Actions
  setItemTypes: (types: string[]) => void
  toggleItemType: (type: string) => void
  clearItemTypes: () => void
  setSourceTypes: (types: string[]) => void
  toggleSourceType: (type: string) => void
  clearSourceTypes: () => void

  reset: () => void
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      disciplines: [],
      decisionMakers: [],
      meetingTypes: [],
      dateFrom: null,
      dateTo: null,
      searchQuery: '',
      itemTypes: [],
      sourceTypes: [],

      setDisciplines: (disciplines) => set({ disciplines }),
      setDecisionMakers: (decisionMakers) => set({ decisionMakers }),
      setMeetingTypes: (meetingTypes) => set({ meetingTypes }),
      setDateRange: (dateFrom, dateTo) => set({ dateFrom, dateTo }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      toggleDiscipline: (discipline) =>
        set((state) => ({
          disciplines: state.disciplines.includes(discipline)
            ? state.disciplines.filter((d) => d !== discipline)
            : [...state.disciplines, discipline],
        })),

      toggleDecisionMaker: (name) =>
        set((state) => ({
          decisionMakers: state.decisionMakers.includes(name)
            ? state.decisionMakers.filter((n) => n !== name)
            : [...state.decisionMakers, name],
        })),

      toggleMeetingType: (type) =>
        set((state) => ({
          meetingTypes: state.meetingTypes.includes(type)
            ? state.meetingTypes.filter((t) => t !== type)
            : [...state.meetingTypes, type],
        })),

      clearDisciplines: () => set({ disciplines: [] }),
      clearDecisionMakers: () => set({ decisionMakers: [] }),
      clearMeetingTypes: () => set({ meetingTypes: [] }),

      // V2 actions
      setItemTypes: (itemTypes) => set({ itemTypes }),
      toggleItemType: (type) =>
        set((state) => ({
          itemTypes: state.itemTypes.includes(type)
            ? state.itemTypes.filter((t) => t !== type)
            : [...state.itemTypes, type],
        })),
      clearItemTypes: () => set({ itemTypes: [] }),

      setSourceTypes: (sourceTypes) => set({ sourceTypes }),
      toggleSourceType: (type) =>
        set((state) => ({
          sourceTypes: state.sourceTypes.includes(type)
            ? state.sourceTypes.filter((t) => t !== type)
            : [...state.sourceTypes, type],
        })),
      clearSourceTypes: () => set({ sourceTypes: [] }),

      reset: () =>
        set({
          disciplines: [],
          decisionMakers: [],
          meetingTypes: [],
          dateFrom: null,
          dateTo: null,
          searchQuery: '',
          itemTypes: [],
          sourceTypes: [],
        }),
    }),
    {
      name: 'filter-storage-v2',
    }
  )
)
