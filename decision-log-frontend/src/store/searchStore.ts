/** Global search (⌘K) open state: the sidebar, the mobile top bar and the shortcut all open it. */
import { create } from 'zustand'

interface SearchState {
  open: boolean
  setOpen: (open: boolean) => void
}

export const useSearchStore = create<SearchState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
