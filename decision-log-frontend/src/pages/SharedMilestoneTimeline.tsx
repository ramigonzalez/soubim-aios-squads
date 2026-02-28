/**
 * SharedMilestoneTimeline — Public read-only view of a project's milestone timeline (Story 8.4).
 *
 * Route: /shared/milestones/:token
 * No authentication required. No navigation bar.
 * Shows project name + "Shared view" badge and renders MilestoneTimeline in readOnly mode.
 */

import { useParams } from 'react-router-dom'
import { AlertCircle, Loader2, Share2 } from 'lucide-react'
import { useSharedTimeline } from '../hooks/useSharedLinks'
import { MilestoneTimeline } from '../components/organisms/MilestoneTimeline'

export function SharedMilestoneTimeline() {
  const { token } = useParams<{ token: string }>()

  const { data, isLoading, error } = useSharedTimeline(token || '')

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 text-lg font-medium">Invalid share link</p>
          <p className="text-gray-500 text-sm mt-1">The link you followed is not valid.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Loading shared timeline...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 text-lg font-medium">This link has expired or been revoked</p>
          <p className="text-gray-500 text-sm mt-2">
            The shared milestone timeline is no longer available. Please contact the project administrator for a new link.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {data.project.name}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
              <Share2 className="w-3 h-3" />
              Shared view
            </span>
          </div>
          {data.project.description && (
            <p className="text-sm text-gray-600">{data.project.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {data.milestones.length} milestone{data.milestones.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Timeline (read-only) */}
        <MilestoneTimeline
          milestones={data.milestones}
          readOnly={true}
          isAdmin={false}
        />

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          Powered by DecisionLog
        </div>
      </div>
    </div>
  )
}
