import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjects } from '../hooks/useProjects'
import { ProjectCard } from '../components/common/ProjectCard'
import { ChevronLeft, ChevronRight, AlertCircle, Loader } from 'lucide-react'

const PAGE_SIZE = 12

/**
 * Projects list page with pagination and React Query caching.
 *
 * Displays:
 * - Grid of project cards
 * - Pagination controls
 * - Loading and error states
 */
export function Projects() {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(0)

  const offset = currentPage * PAGE_SIZE
  const { data, isLoading, error } = useProjects({
    limit: PAGE_SIZE,
    offset,
  })

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0
  const hasNextPage = currentPage < totalPages - 1
  const hasPrevPage = currentPage > 0

  const handlePrevPage = () => {
    if (hasPrevPage) {
      setCurrentPage(currentPage - 1)
      window.scrollTo(0, 0)
    }
  }

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(currentPage + 1)
      window.scrollTo(0, 0)
    }
  }

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Projects</h1>
          <p className="text-gray-600">
            {data?.total || 0} project{data?.total !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">Loading projects...</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 flex items-start space-x-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-1">Failed to Load Projects</h3>
              <p className="text-red-700 text-sm">
                {error instanceof Error ? error.message : 'An error occurred while fetching projects.'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        ) : !data?.projects || data.projects.length === 0 ? (
          /* Empty State */
          <div className="bg-gray-100 rounded-lg p-12 text-center">
            <p className="text-gray-600 text-lg">No projects yet</p>
            <p className="text-gray-500 text-sm mt-1">Projects will appear here as they are created</p>
          </div>
        ) : (
          /* Projects Grid */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {data.projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={handleProjectClick}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {currentPage + 1} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={!hasPrevPage}
                    className="flex items-center space-x-1 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={!hasNextPage}
                    className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
