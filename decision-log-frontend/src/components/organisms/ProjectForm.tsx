/**
 * ProjectForm — Full project create/edit form with stages and participants.
 * Story 6.2: Frontend — Project Create/Edit Form
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StageScheduleBuilder, { StageRow } from './StageScheduleBuilder'
import ParticipantRoster, { ParticipantRow } from './ParticipantRoster'
import { useCreateProject, useUpdateProject, useSetStages } from '../../hooks/useProjectMutation'

interface ProjectFormProps {
  mode: 'create' | 'edit'
  initialData?: {
    title: string
    description: string
    project_type: string
    stages: StageRow[]
    participants: ParticipantRow[]
  }
  projectId?: string
}

const PROJECT_TYPES = [
  { value: '', label: 'Select type...' },
  { value: 'architecture_full', label: 'Architecture Full' },
  { value: 'architecture_legal', label: 'Architecture Legal' },
  { value: 'custom', label: 'Custom' },
]

export default function ProjectForm({ mode, initialData, projectId }: ProjectFormProps) {
  const navigate = useNavigate()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject(projectId || '')
  const setStagesMutation = useSetStages(projectId || '')

  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [projectType, setProjectType] = useState(initialData?.project_type || '')
  const [stages, setStages] = useState<StageRow[]>(initialData?.stages || [])
  const [participants, setParticipants] = useState<ParticipantRow[]>(
    initialData?.participants || []
  )
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setIsSubmitting(true)

    try {
      if (mode === 'create') {
        const result = await createProject.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          project_type: projectType || undefined,
          stages: stages.length > 0
            ? stages.filter((s) => s.stage_name && s.stage_from && s.stage_to)
            : undefined,
          participants: participants.length > 0
            ? participants
                .filter((p) => p.name)
                .map((p) => ({
                  name: p.name,
                  email: p.email || undefined,
                  discipline: p.discipline,
                  role: p.role || undefined,
                }))
            : undefined,
        })
        navigate(`/projects/${result.id}`)
      } else if (mode === 'edit' && projectId) {
        await updateProject.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          project_type: projectType || undefined,
        })
        const validStages = stages.filter((s) => s.stage_name && s.stage_from && s.stage_to)
        if (validStages.length > 0) {
          await setStagesMutation.mutateAsync(validStages)
        }
        navigate(`/projects/${projectId}`)
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to save project')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Project Details */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Project Details</h2>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g., Residential Tower Alpha"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Brief description of the project..."
          />
        </div>

        <div>
          <label htmlFor="projectType" className="block text-sm font-medium text-gray-700">
            Project Type
          </label>
          <select
            id="projectType"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {PROJECT_TYPES.map((pt) => (
              <option key={pt.value} value={pt.value}>
                {pt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Stage Schedule */}
      <section className="border-t pt-6">
        <StageScheduleBuilder stages={stages} onChange={setStages} />
      </section>

      {/* Participant Roster */}
      <section className="border-t pt-6">
        <ParticipantRoster participants={participants} onChange={setParticipants} />
      </section>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t pt-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Project' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
