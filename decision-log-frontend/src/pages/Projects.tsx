import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import api from '../services/api'
import { Project } from '../types/project'

export function Projects() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useQuery<{ projects: Project[]; total: number }>('projects', async () => {
    const response = await api.get('/projects')
    return response.data
  })

  if (isLoading) return <div className="p-8">Loading projects...</div>
  if (error) return <div className="p-8 text-red-600">Failed to load projects</div>

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Projects</h1>

      {!data?.projects || data.projects.length === 0 ? (
        <div className="bg-gray-100 p-8 rounded-lg text-center">
          <p className="text-gray-600">No projects yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.projects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition"
            >
              <h2 className="text-xl font-semibold mb-2">{project.name}</h2>
              <p className="text-gray-600 mb-4">{project.description}</p>
              <div className="text-sm text-gray-500">
                <p>Members: {project.member_count || 0}</p>
                <p>Decisions: {project.decision_count || 0}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
