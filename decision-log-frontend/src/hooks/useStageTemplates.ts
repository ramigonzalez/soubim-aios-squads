/**
 * Hook to fetch stage templates from the API.
 * Story 6.2: Frontend — Project Create/Edit Form
 */
import { useQuery } from 'react-query'
import api from '../services/api'

export interface StageTemplateStage {
  stage_name: string
  default_duration_days: number
}

export interface StageTemplate {
  id: string
  project_type: string
  template_name: string
  stages: StageTemplateStage[]
}

interface StageTemplatesResponse {
  templates: StageTemplate[]
}

export function useStageTemplates(enabled = true) {
  return useQuery<StageTemplatesResponse, Error>(
    ['stageTemplates'],
    async () => {
      const response = await api.get<StageTemplatesResponse>('/stage-templates')
      return response.data
    },
    {
      enabled,
      staleTime: 60000,
      retry: 1,
    }
  )
}
