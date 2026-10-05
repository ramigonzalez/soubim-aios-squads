/**
 * SharedMilestoneTimeline — Public read-only view of a project's milestone timeline (Story 8.4).
 *
 * Route: /shared/milestones/:token
 * No authentication required. No navigation bar.
 * Shows project name + "Shared view" badge and renders MilestoneTimeline in readOnly mode.
 */

import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Loader2, Share2 } from 'lucide-react'
import { useSharedTimeline } from '../hooks/useSharedLinks'
import { MilestoneTimeline } from '../components/organisms/MilestoneTimeline'
import type { ProjectItem, ProjectStage } from '../types/projectItem'

export function SharedMilestoneTimeline() {
  const { t } = useTranslation('milestones')
  const { token } = useParams<{ token: string }>()

  const { data, isLoading, error } = useSharedTimeline(token || '')

  // Map shared data to component types (hooks must be called before early returns)
  const stages: ProjectStage[] = useMemo(() =>
    (data?.stages || []).map(s => ({
      id: s.id,
      stage_name: s.stage_name,
      stage_from: s.stage_from,
      stage_to: s.stage_to,
    })),
    [data?.stages]
  )

  const milestones: ProjectItem[] = useMemo(() =>
    (data?.milestones || []).map(m => ({
      id: m.id,
      statement: m.statement,
      decision_statement: m.statement,
      discipline: m.discipline,
      affected_disciplines: m.affected_disciplines || [],
      who: m.who,
      timestamp: m.timestamp,
      created_at: m.created_at,
      meeting_date: '',
      is_done: m.is_done,
      is_milestone: true,
      item_type: 'decision' as const,
      source_type: 'meeting' as const,
      project_id: data?.project.id || '',
    })),
    [data?.milestones, data?.project.id]
  )

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 text-lg font-medium">{t('shared.invalidTitle')}</p>
          <p className="text-gray-500 text-sm mt-1">{t('shared.invalidBody')}</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">{t('shared.loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 text-lg font-medium">{t('shared.expiredTitle')}</p>
          <p className="text-gray-500 text-sm mt-2">
            {t('shared.expiredBody')}
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
              {t('shared.badge')}
            </span>
          </div>
          {data.project.description && (
            <p className="text-sm text-gray-600">{data.project.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {t('shared.count', { count: milestones.length })}
          </p>
        </div>

        {/* Timeline (read-only, pre-loaded stages) */}
        <MilestoneTimeline
          milestones={milestones}
          preloadedStages={stages}
          readOnly={true}
          isAdmin={false}
        />

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          {t('shared.poweredBy', { appName: t('common:appName') })}
        </div>
      </div>
    </div>
  )
}
