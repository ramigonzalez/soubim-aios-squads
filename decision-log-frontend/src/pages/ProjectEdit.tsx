/**
 * ProjectEdit page — edit an existing project.
 * Story 6.4: Project CRUD Completion
 */
import { useParams, useNavigate } from 'react-router-dom'
import { Loader } from 'lucide-react'
import { ProjectForm } from '../components/organisms/ProjectForm'
import { useProject } from '../hooks/useProject'
import { useUpdateProject } from '../hooks/useProjectMutation'

export default function ProjectEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: project, isLoading, error } = useProject(id)
  const updateProject = useUpdateProject(id || '')

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Edit Project</h1>
          {updateProject.isError && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              Failed to update project. Please try again.
            </div>
          )}
          <ProjectForm
            initialData={{
              id: project.id,
              name: project.name,
              description: project.description || '',
              project_type: project.project_type || '',
              drive_folder_id: project.drive_folder_id || '',
            }}
            onSubmit={(data) => {
              updateProject.mutate(
                {
                  title: data.name,
                  description: data.description,
                  project_type: data.project_type,
                  drive_folder_id: data.drive_folder_id,
                },
                {
                  onSuccess: () => {
                    navigate(`/projects/${id}`)
                  },
                }
              )
            }}
            onCancel={() => navigate(`/projects/${id}`)}
            isLoading={updateProject.isLoading}
          />
        </div>
      </div>
    </div>
  )
}
