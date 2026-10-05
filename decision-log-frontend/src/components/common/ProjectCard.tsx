import { Users, FileText, Calendar } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { StagePill } from '../molecules/StagePill'
import { dateLocale } from '../../i18n'

interface ProjectCardProject {
  id: string
  name: string
  description?: string | null
  project_type?: string | null
  current_stage?: { name: string; stage_from?: string; stage_to?: string } | null
  member_count?: number
  participant_count?: number
  item_count?: number
  decision_count?: number
  created_at: string
}

interface ProjectCardProps {
  project: ProjectCardProject
  onClick: (projectId: string) => void
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const { t } = useTranslation('projects')
  const createdDate = new Date(project.created_at).toLocaleDateString(dateLocale(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const itemCount = project.item_count ?? project.decision_count ?? 0

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
      {/* Header: Name + Type */}
      <div className="mb-2">
        <h2 className="text-xl font-semibold text-gray-900 truncate">{project.name}</h2>
        {project.project_type && (
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            {project.project_type.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Current Stage */}
      <div className="mb-3">
        {project.current_stage ? (
          <StagePill stageName={project.current_stage.name} isCurrent />
        ) : (
          <span className="text-xs text-gray-400">{t('card.noStages')}</span>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
        {project.description || t('card.noDescription')}
      </p>

      {/* Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-700">
          <Users className="w-4 h-4 mr-2 text-blue-500" />
          <span>
            {t('card.members', { count: project.member_count || 0 })}
          </span>
        </div>

        <div className="flex items-center text-sm text-gray-700">
          <FileText className="w-4 h-4 mr-2 text-green-500" />
          <span>
            {t('card.items', { count: itemCount })}
          </span>
        </div>

        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
          <span>{t('card.created', { date: createdDate })}</span>
        </div>
      </div>

      {/* CTA */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-blue-600 font-medium">{t('card.viewDetails')}</p>
      </div>
    </div>
  )
}
