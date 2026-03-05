/**
 * ProjectEdit page — edit an existing project.
 * Story 6.4: Project CRUD Completion
 * Story 6.5: Load stages/participants, orchestrate update
 */
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader } from 'lucide-react'
import { ProjectForm, ProjectFormData } from '../components/organisms/ProjectForm'
import { useProject } from '../hooks/useProject'
import { useUpdateProject } from '../hooks/useProjectMutation'
import { useStages } from '../hooks/useStages'
import { useParticipants } from '../hooks/useParticipants'
import { StageRow } from '../components/organisms/StageScheduleBuilder'
import { ParticipantRow } from '../components/organisms/ParticipantRoster'
import api from '../services/api'

export default function ProjectEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: project, isLoading: projectLoading, error: projectError } = useProject(id)
  const updateProject = useUpdateProject(id || '')
  const { data: stagesData, isLoading: stagesLoading } = useStages({ projectId: id || '' })
  const { data: participantsData, isLoading: participantsLoading } = useParticipants(id || '')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const isLoading = projectLoading || stagesLoading || participantsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (projectError || !project) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-red-600">Failed to load project.</p>
      </div>
    )
  }

  // Transform stages to StageRow format
  const initialStages: StageRow[] = (stagesData?.stages || []).map(s => ({
    stage_name: s.stage_name,
    stage_from: s.stage_from,
    stage_to: s.stage_to,
  }))

  // Transform participants to ParticipantRow format
  const initialParticipants: ParticipantRow[] = (participantsData || []).map(p => ({
    name: p.name,
    email: p.email || '',
    discipline: p.discipline || 'general',
    role: p.role || '',
  }))

  const handleSubmit = async (data: ProjectFormData) => {
    if (!id) return
    setError(null)
    setIsSaving(true)

    try {
      // Step 1: Update project details
      await updateProject.mutateAsync({
        title: data.name,
        description: data.description,
        project_type: data.project_type,
        drive_folder_id: data.drive_folder_id,
      })

      // Step 2: Replace all stages
      await api.post(`/projects/${id}/stages`, data.stages)

      // Step 3: Reconcile participants — delete old, add new
      // Delete existing participants
      if (participantsData) {
        for (const existing of participantsData) {
          await api.delete(`/projects/${id}/participants/${existing.id}`)
        }
      }
      // Add new participants
      for (const participant of data.participants) {
        if (participant.name.trim()) {
          await api.post(`/projects/${id}/participants`, {
            name: participant.name.trim(),
            email: participant.email.trim() || undefined,
            discipline: participant.discipline,
            role: participant.role.trim() || undefined,
          })
        }
      }

      navigate(`/projects/${id}`)
    } catch (err) {
      console.error('Error updating project:', err)
      setError('Failed to update project. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Edit Project</h1>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <ProjectForm
            initialData={{
              id: project.id,
              name: project.name,
              description: project.description || '',
              project_type: project.project_type || '',
              drive_folder_id: project.drive_folder_id || '',
              stages: initialStages,
              participants: initialParticipants,
            }}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/projects/${id}`)}
            isLoading={isSaving}
          />
        </div>
      </div>
    </div>
  )
}
