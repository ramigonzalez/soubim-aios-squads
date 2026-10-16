/** Promem revamp Phase 5: landing page requests, for the platform operator. */
import { useMutation, useQuery, useQueryClient } from 'react-query'
import api from '../services/api'

export interface SiteLead {
  id: string
  mode: 'demo' | 'pilot'
  name: string
  company: string
  whatsapp: string
  email: string
  role: 'partner' | 'coordinator' | 'architect' | 'other' | null
  team_size: '1-9' | '10-24' | '25-50' | '50+' | null
  created_at: string
  handled_at: string | null
  handled_by: string | null
}

const KEY = ['platform', 'leads']

export function useSiteLeads() {
  return useQuery<SiteLead[], Error>(KEY, async () => (await api.get<{ leads: SiteLead[] }>('/platform/leads')).data.leads, { staleTime: 30_000 })
}

export function useSetLeadHandled() {
  const queryClient = useQueryClient()
  return useMutation(
    async ({ id, handled }: { id: string; handled: boolean }) => (await api.patch<SiteLead>(`/platform/leads/${id}`, { handled })).data,
    { onSuccess: () => void queryClient.invalidateQueries(KEY) },
  )
}

/** "11987654321" → "(11) 9 8765-4321"; landlines "(11) 3456-7890". */
export function formatPhone(digits: string): string {
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits[2]} ${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return digits
}
