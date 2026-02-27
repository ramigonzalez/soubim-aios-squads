/**
 * ProjectEdit page — edit an existing project.
 * Story 6.2: Frontend — Project Create/Edit Form
 */
import { useParams } from 'react-router-dom'
import { Loader } from 'lucide-react'
import ProjectForm from '../components/organisms/ProjectForm'
import { useProject } from '../hooks/useProject'
import { StageRow } from '../components/organisms/StageScheduleBuilder'
import { ParticipantRow } from '../components/organisms/ParticipantRoster'
import api from '../services/api'
import { useQuery } from 'react-query'

interface ParticipantResponse {
  id: string
  name: string
  email?: string
  discipline: string
  role?: string
}

export default function ProjectEdit() {
  const { id } = useParams<{ id: string }>()
  const { data: project, isLoading, error } = useProject(id)

  const { data: participantsData } = useQuery<ParticipantResponse[]>(
    ['participants', id],
    async () => {
      const res = await api.get(`/projects/${id}/participants`)
      return res.data?.participants ?? res.data ?? []
    },
    { enabled: !!id }
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-red-600">Failed to load project.</p>
      </div>
    )
  }

  const stages: StageRow[] = (project.stages || []).map((s) => ({
    stage_name: s.stage_name,
    stage_from: s.stage_from?.split('T')[0] || '',
    stage_to: s.stage_to?.split('T')[0] || '',
  }))

  const participants: ParticipantRow[] = (participantsData || []).map((p) => ({
    name: p.name,
    email: p.email || '',
    discipline: p.discipline,
    role: p.role || '',
  }))

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Edit Project</h1>
        <ProjectForm
          mode="edit"
          projectId={id}
          initialData={{
            title: project.name,
            description: project.description || '',
            project_type: project.project_type || '',
            stages,
            participants,
          }}
        />
      </div>
    </div>
  )
}
