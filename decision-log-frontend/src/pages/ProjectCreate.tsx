/**
 * ProjectCreate page — create a new project.
 * Story 6.2: Frontend — Project Create/Edit Form
 */
import ProjectForm from '../components/organisms/ProjectForm'

export default function ProjectCreate() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Create New Project</h1>
        <ProjectForm mode="create" />
      </div>
    </div>
  )
}
