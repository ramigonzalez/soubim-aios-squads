import React from 'react'
import { Project } from '../../types/project'
import { Users, FileText, Calendar } from 'lucide-react'

interface ProjectCardProps {
  project: Project
  onClick: (projectId: string) => void
}

/**
 * Project card component displaying project metadata.
 *
 * Shows:
 * - Project name
 * - Description
 * - Member count
 * - Decision count
 * - Creation date
 */
export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const createdDate = new Date(project.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div
      onClick={() => onClick(project.id)}
      className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg hover:scale-105 cursor-pointer transition-all duration-200"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick(project.id)
        }
      }}
    >
      {/* Project Name */}
      <h2 className="text-xl font-semibold mb-2 text-gray-900 truncate">{project.name}</h2>

      {/* Description */}
      <p className="text-gray-600 mb-4 line-clamp-2 text-sm">{project.description || 'No description'}</p>

      {/* Stats */}
      <div className="space-y-2 mb-4">
        {/* Members */}
        <div className="flex items-center text-sm text-gray-700">
          <Users className="w-4 h-4 mr-2 text-blue-500" />
          <span>
            {project.member_count || 0} member{project.member_count !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Decisions */}
        <div className="flex items-center text-sm text-gray-700">
          <FileText className="w-4 h-4 mr-2 text-green-500" />
          <span>
            {project.decision_count || 0} decision{project.decision_count !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Created Date */}
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
          <span>Created {createdDate}</span>
        </div>
      </div>

      {/* CTA */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-blue-600 font-medium">View Details →</p>
      </div>
    </div>
  )
}
