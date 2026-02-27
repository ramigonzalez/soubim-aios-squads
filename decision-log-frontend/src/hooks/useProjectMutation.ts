/**
 * Mutation hooks for project create/update/archive.
 * Story 6.2: Frontend — Project Create/Edit Form
 */
import { useMutation, useQueryClient } from 'react-query'
import api from '../services/api'

interface ProjectCreateData {
  title: string
  description?: string
  project_type?: string
  stages?: Array<{
    stage_name: string
    stage_from: string
    stage_to: string
  }>
  participants?: Array<{
    name: string
    email?: string
    discipline: string
    role?: string
  }>
}

interface ProjectUpdateData {
  title?: string
  description?: string
  project_type?: string
  actual_stage_id?: string
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation<any, Error, ProjectCreateData>(
    async (data) => {
      const response = await api.post('/projects/', data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['projects'])
      },
    }
  )
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<any, Error, ProjectUpdateData>(
    async (data) => {
      const response = await api.patch(`/projects/${projectId}`, data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['projects'])
        queryClient.invalidateQueries(['project', projectId])
      },
    }
  )
}

export function useArchiveProject() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>(
    async (projectId) => {
      await api.delete(`/projects/${projectId}`)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['projects'])
      },
    }
  )
}

export function useSetStages(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<any, Error, Array<{ stage_name: string; stage_from: string; stage_to: string }>>(
    async (stages) => {
      const response = await api.post(`/projects/${projectId}/stages`, stages)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project', projectId])
      },
    }
  )
}

export function useAddParticipant(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<any, Error, { name: string; email?: string; discipline: string; role?: string }>(
    async (data) => {
      const response = await api.post(`/projects/${projectId}/participants`, data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project', projectId])
        queryClient.invalidateQueries(['participants', projectId])
      },
    }
  )
}
