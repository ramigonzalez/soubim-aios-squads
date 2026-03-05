/**
 * ProjectCreate page — create a new project.
 * Story 6.4: Project CRUD Completion
 * Story 6.5: Sequential create flow — project → stages → participants
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProjectForm, ProjectFormData } from '../components/organisms/ProjectForm'
import { useCreateProject } from '../hooks/useProjectMutation'
import api from '../services/api'

export default function ProjectCreate() {
  const navigate = useNavigate()
  const createProject = useCreateProject()
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (data: ProjectFormData) => {
    setError(null)
    setIsSaving(true)

    try {
      // Step 1: Create the project
      const project = await createProject.mutateAsync({
        title: data.name,
        description: data.description,
        project_type: data.project_type,
        drive_folder_id: data.drive_folder_id,
      }) as { id: string }

      const projectId = project?.id
      if (!projectId) {
        navigate('/projects')
        return
      }

      // Step 2: Set stages (if any)
      if (data.stages.length > 0) {
        await api.post(`/projects/${projectId}/stages`, data.stages)
      }

      // Step 3: Add participants (if any)
      for (const participant of data.participants) {
        if (participant.name.trim()) {
          await api.post(`/projects/${projectId}/participants`, {
            name: participant.name.trim(),
            email: participant.email.trim() || undefined,
            discipline: participant.discipline,
            role: participant.role.trim() || undefined,
          })
        }
      }

      navigate(`/projects/${projectId}`)
    } catch (err) {
      console.error('Error creating project:', err)
      setError('Failed to create project. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Create New Project</h1>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <ProjectForm
            onSubmit={handleSubmit}
            onCancel={() => navigate('/projects')}
            isLoading={isSaving}
          />
        </div>
      </div>
    </div>
  )
}
