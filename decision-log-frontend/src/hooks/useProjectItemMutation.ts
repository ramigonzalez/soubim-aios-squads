/**
 * Mutation hooks for project items (create, update, toggle milestone/done).
 * Story 5.3: Frontend Types & Hooks Migration
 */
import { useMutation, useQueryClient, QueryKey } from 'react-query'
import api from '../services/api'
import { ProjectItem, ProjectItemCreate, ProjectItemUpdate, ProjectItemsResponse } from '../types/projectItem'

interface OptimisticContext {
  previous: [QueryKey, ProjectItemsResponse | undefined][]
}

export function useCreateProjectItem(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<ProjectItem, Error, ProjectItemCreate>(
    async (data) => {
      const response = await api.post<ProjectItem>(
        `/projects/${projectId}/items`,
        data
      )
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['projectItems', projectId])
        queryClient.invalidateQueries(['milestones', projectId])
      },
    }
  )
}

export function useUpdateProjectItem(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<ProjectItem, Error, { itemId: string; data: ProjectItemUpdate }>(
    async ({ itemId, data }) => {
      const response = await api.patch<ProjectItem>(
        `/projects/${projectId}/items/${itemId}`,
        data
      )
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['projectItems', projectId])
        queryClient.invalidateQueries(['milestones', projectId])
      },
    }
  )
}

export function useToggleMilestone(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<ProjectItem, Error, { itemId: string; isMilestone: boolean }, OptimisticContext>(
    async ({ itemId, isMilestone }) => {
      const response = await api.patch<ProjectItem>(
        `/projects/${projectId}/items/${itemId}`,
        { is_milestone: isMilestone }
      )
      return response.data
    },
    {
      onMutate: async ({ itemId, isMilestone }) => {
        await queryClient.cancelQueries(['projectItems', projectId])
        const previous = queryClient.getQueriesData<ProjectItemsResponse>(['projectItems', projectId])
        queryClient.setQueriesData<ProjectItemsResponse>(
          ['projectItems', projectId],
          (old) => old ? {
            ...old,
            items: old.items.map((item) =>
              item.id === itemId ? { ...item, is_milestone: isMilestone } : item
            ),
          } : old!,
        )
        return { previous }
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          for (const [key, data] of context.previous) {
            queryClient.setQueryData(key, data)
          }
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries(['projectItems', projectId])
        queryClient.invalidateQueries(['milestones', projectId])
      },
    }
  )
}

export function useToggleDone(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<ProjectItem, Error, { itemId: string; isDone: boolean }, OptimisticContext>(
    async ({ itemId, isDone }) => {
      const response = await api.patch<ProjectItem>(
        `/projects/${projectId}/items/${itemId}`,
        { is_done: isDone }
      )
      return response.data
    },
    {
      onMutate: async ({ itemId, isDone }) => {
        await queryClient.cancelQueries(['projectItems', projectId])
        const previous = queryClient.getQueriesData<ProjectItemsResponse>(['projectItems', projectId])
        queryClient.setQueriesData<ProjectItemsResponse>(
          ['projectItems', projectId],
          (old) => old ? {
            ...old,
            items: old.items.map((item) =>
              item.id === itemId ? { ...item, is_done: isDone } : item
            ),
          } : old!,
        )
        return { previous }
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          for (const [key, data] of context.previous) {
            queryClient.setQueryData(key, data)
          }
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries(['projectItems', projectId])
      },
    }
  )
}
