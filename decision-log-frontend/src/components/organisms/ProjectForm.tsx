import { useState } from 'react'
import { Project } from '../../types/project'

interface ProjectFormData {
  name: string
  description: string
  project_type: string
  drive_folder_id?: string
}

interface ProjectFormProps {
  initialData?: Partial<Project>
  onSubmit: (data: ProjectFormData) => void
  onCancel?: () => void
  isLoading?: boolean
}

/**
 * Project create/edit form component.
 *
 * Story 10.3: Includes optional Google Drive Folder ID field
 * for configuring automatic document monitoring.
 */
export function ProjectForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProjectFormProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [projectType, setProjectType] = useState(initialData?.project_type || '')
  const [driveFolderId, setDriveFolderId] = useState(initialData?.drive_folder_id || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      project_type: projectType.trim() || undefined as unknown as string,
      drive_folder_id: driveFolderId.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Project Details</h3>

        {/* Name */}
        <div>
          <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">
            Project Name
          </label>
          <input
            id="projectName"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter project name"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="projectDescription" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="projectDescription"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Describe the project"
          />
        </div>

        {/* Project Type */}
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
            <option value="">Select type...</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="mixed-use">Mixed Use</option>
            <option value="institutional">Institutional</option>
            <option value="infrastructure">Infrastructure</option>
          </select>
        </div>

        {/* Google Drive Folder ID (Story 10.3) */}
        <div>
          <label htmlFor="driveFolderId" className="block text-sm font-medium text-gray-700">
            Google Drive Folder ID
          </label>
          <input
            id="driveFolderId"
            type="text"
            value={driveFolderId}
            onChange={(e) => setDriveFolderId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g., 1a2b3c4d5e6f7g8h9i0j"
          />
          <p className="mt-1 text-xs text-gray-500">
            Paste the folder ID from Google Drive to enable automatic document monitoring
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : initialData?.id ? 'Update Project' : 'Create Project'}
        </button>
      </div>
    </form>
  )
}
