import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ProjectItem } from '../../types/projectItem'
import { DecisionRow } from './DecisionRow'
import { MeetingTypeBadge } from '../atoms/MeetingTypeBadge'
import { ParticipantIndicator } from '../atoms/ParticipantIndicator'
import { DisciplinePill } from '../atoms/DisciplinePill'

export interface MeetingGroupData {
  meetingTitle: string
  meetingType?: string
  meetingDate?: string
  transcriptId?: string
  participants: Array<{ name: string; role: string }>
  decisions: ProjectItem[]
}

interface MeetingGroupProps {
  meeting: MeetingGroupData
  onSelectDecision: (id: string) => void
}

const ROLE_DISCIPLINE_MAP: Record<string, string> = {
  'structural engineer': 'structural',
  'mep engineer': 'mep',
  'project director': 'architecture',
  'architect': 'architecture',
  'plumbing engineer': 'plumbing',
  'electrical engineer': 'electrical',
  'landscape architect': 'landscape',
  'sustainability engineer': 'landscape',
}

function getParticipantDisciplines(participants: Array<{ name: string; role: string }>): string[] {
  const disciplines = new Set<string>()
  for (const p of participants) {
    const discipline = ROLE_DISCIPLINE_MAP[p.role.toLowerCase()]
    if (discipline) disciplines.add(discipline)
  }
  return Array.from(disciplines)
}

const MAX_VISIBLE_DISCIPLINES = 3
const COLLAPSE_THRESHOLD = 5

export function MeetingGroup({ meeting, onSelectDecision }: MeetingGroupProps) {
  const defaultExpanded = meeting.decisions.length <= COLLAPSE_THRESHOLD
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const disciplines = getParticipantDisciplines(meeting.participants)
  const visibleDisciplines = disciplines.slice(0, MAX_VISIBLE_DISCIPLINES)
  const overflowCount = disciplines.length > MAX_VISIBLE_DISCIPLINES + 1
    ? disciplines.length - MAX_VISIBLE_DISCIPLINES
    : 0
  // If there are exactly MAX_VISIBLE_DISCIPLINES + 1, show all instead of "+1 more"
  const showAllDisciplines = !overflowCount
  const displayDisciplines = showAllDisciplines ? disciplines : visibleDisciplines

  const isOrphan = !meeting.transcriptId
  const meetingId = meeting.transcriptId || 'orphan'
  const decisionListId = `meeting-${meetingId}-decisions`

  const borderColor = 'border-l-gray-300'

  const handleToggle = () => setIsExpanded((prev) => !prev)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }

  const srLabel = [
    `Meeting: ${meeting.meetingTitle}`,
    meeting.meetingType,
    meeting.participants.length > 0 ? `${meeting.participants.length} participants` : null,
    `${meeting.decisions.length} decisions`,
    isExpanded ? 'expanded' : 'collapsed',
  ].filter(Boolean).join(', ')

  return (
    <div
      role="region"
      aria-label={`${meeting.meetingTitle}, ${meeting.decisions.length} decisions`}
      className={`bg-white border border-gray-200 border-l-4 ${borderColor} rounded-lg shadow-sm overflow-hidden`}
    >
      {/* Header — clickable to toggle */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={decisionListId}
        aria-label={srLabel}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="px-4 py-3 cursor-pointer hover:bg-gray-50/60 transition-colors select-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      >
        {/* Row 1: Title + MeetingTypeBadge */}
        <div className="flex items-center gap-2">
          <h3 className={`text-sm font-semibold ${isOrphan ? 'text-gray-400 italic' : 'text-gray-900'} truncate flex-1`}>
            {meeting.meetingTitle}
          </h3>
          {!isOrphan && <MeetingTypeBadge type={meeting.meetingType} />}
        </div>

        {/* Row 2: Discipline badges + ParticipantIndicator + count + chevron */}
        <div className="flex items-center gap-2 mt-1.5">
          {/* Discipline badges */}
          <div className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
            {displayDisciplines.map((disc) => (
              <DisciplinePill key={disc} discipline={disc} />
            ))}
            {overflowCount > 0 && (
              <span className="bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap">
                +{overflowCount} more
              </span>
            )}
          </div>

          {/* Participant indicator */}
          {!isOrphan && meeting.participants.length > 0 && (
            <div onClick={(e) => e.stopPropagation()}>
              <ParticipantIndicator participants={meeting.participants} />
            </div>
          )}

          {/* Decision count */}
          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
            {meeting.decisions.length} decision{meeting.decisions.length !== 1 ? 's' : ''}
          </span>

          {/* Chevron */}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Decision list (collapsible) — gray inset background */}
      {isExpanded && (
        <div id={decisionListId} role="list" className="border-t border-gray-200 bg-gray-50/80 px-2 pt-1 pb-1">
          {meeting.decisions.map((decision, index) => (
            <div
              key={decision.id}
              role="listitem"
              className={index < meeting.decisions.length - 1 ? 'border-b border-gray-100' : ''}
            >
              <DecisionRow
                decision={decision}
                onClick={onSelectDecision}
                showDiscipline={true}
                showAffectedDisciplines={true}
                inMeetingGroup={true}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
