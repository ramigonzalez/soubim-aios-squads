import { create } from 'zustand'

/** Same key the API client reads to send the X-Organization-Id header. */
export const ACTIVE_ORGANIZATION_KEY = 'active_organization_id'

function stored(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ORGANIZATION_KEY)
  } catch {
    return null
  }
}

interface OrganizationStore {
  /** Active organization chosen by the user; null = not chosen yet (the first organization is used). */
  activeOrganizationId: string | null
  setActiveOrganizationId: (id: string | null) => void
}

export const useOrganizationStore = create<OrganizationStore>(set => ({
  activeOrganizationId: stored(),
  setActiveOrganizationId: id => {
    try {
      if (id) localStorage.setItem(ACTIVE_ORGANIZATION_KEY, id)
      else localStorage.removeItem(ACTIVE_ORGANIZATION_KEY)
    } catch {
      // storage unavailable: the choice lasts until reload
    }
    set({ activeOrganizationId: id })
  },
}))
