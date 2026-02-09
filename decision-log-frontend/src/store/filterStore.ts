import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FilterState {
  // Filters
  disciplines: string[]
  decisionMakers: string[]
  meetingTypes: string[]
  dateFrom: string | null
  dateTo: string | null
  searchQuery: string

  // Actions
  setDisciplines: (disciplines: string[]) => void
  setDecisionMakers: (names: string[]) => void
  setMeetingTypes: (types: string[]) => void
  setDateRange: (from: string | null, to: string | null) => void
  setSearchQuery: (query: string) => void
  toggleDiscipline: (discipline: string) => void
  toggleDecisionMaker: (name: string) => void
  toggleMeetingType: (type: string) => void
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

      setDisciplines: (disciplines) => set({ disciplines }),
      setDecisionMakers: (decisionMakers) => set({ decisionMakers }),
      setMeetingTypes: (meetingTypes) => set({ meetingTypes }),
      setDateRange: (dateFrom, dateTo) => set({ dateFrom, dateTo }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      toggleDiscipline: (discipline) => set((state) => ({
        disciplines: state.disciplines.includes(discipline)
          ? state.disciplines.filter(d => d !== discipline)
          : [...state.disciplines, discipline]
      })),

      toggleDecisionMaker: (name) => set((state) => ({
        decisionMakers: state.decisionMakers.includes(name)
          ? state.decisionMakers.filter(n => n !== name)
          : [...state.decisionMakers, name]
      })),

      toggleMeetingType: (type) => set((state) => ({
        meetingTypes: state.meetingTypes.includes(type)
          ? state.meetingTypes.filter(t => t !== type)
          : [...state.meetingTypes, type]
      })),

      reset: () => set({
        disciplines: [],
        decisionMakers: [],
        meetingTypes: [],
        dateFrom: null,
        dateTo: null,
        searchQuery: '',
      }),
    }),
    {
      name: 'filter-storage',
    }
  )
)
