import { useState } from 'react'
import { ProjectItem, ConsensusEntry } from '../../types/projectItem'
import { DisciplineCircle } from '../atoms/DisciplineCircle'
import { MilestoneStarToggle } from '../molecules/MilestoneStarToggle'
import { formatDateTime, formatTimestamp, getDisciplineLabel } from '../../lib/utils'
import { X, Clock, FileText, User, Calendar, CheckCircle2, XCircle, MinusCircle } from 'lucide-react'

interface DrilldownModalProps {
  decision: ProjectItem | null
  onClose: () => void
  onToggleMilestone?: (id: string) => void
  isAdmin?: boolean
}

/** Normalize consensus value — handles both V2 ConsensusEntry objects and V1 string values */
function getConsensusStatus(value: ConsensusEntry | string): string {
  if (typeof value === 'string') return value
  return value.status
}

function getStanceIcon(stance: string) {
  const s = stance.toUpperCase()
  if (s === 'AGREE') return <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
  if (s === 'DISAGREE' || s === 'DISSENT') return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
  return <MinusCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
}

function getStanceTextColor(stance: string) {
  const s = stance.toUpperCase()
  if (s === 'AGREE') return 'text-green-700'
  if (s === 'DISAGREE' || s === 'DISSENT') return 'text-red-700'
  return 'text-amber-700'
}

export function DrilldownModal({ decision, onClose, onToggleMilestone, isAdmin }: DrilldownModalProps) {
  const [activeTab, setActiveTab] = useState('overview')

  if (!decision) return null

  const consensusEntries = decision.consensus && typeof decision.consensus === 'object'
    ? Object.entries(decision.consensus)
    : []
  const agreeCount = consensusEntries.filter(([, value]) => getConsensusStatus(value).toUpperCase() === 'AGREE').length
  const totalCount = consensusEntries.length

  // Story 9.3: Full discipline list — use affected_disciplines array
  const allDisciplines = decision.affected_disciplines?.length > 0
    ? decision.affected_disciplines
    : ['general']

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-2 flex-1 min-w-0 pr-4">
              <h2 className="text-2xl font-bold text-gray-900 leading-tight flex-1 min-w-0">
                {decision.statement}
              </h2>
              {/* Story 8.2: Milestone star toggle */}
              {isAdmin && onToggleMilestone && (
                <MilestoneStarToggle
                  isMilestone={decision.is_milestone}
                  onToggle={() => onToggleMilestone(decision.id)}
                  size="md"
                />
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Story 9.3: Full discipline list with circles and labels */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {allDisciplines.map((disc, i) => (
              <span key={disc} className="inline-flex items-center gap-1.5">
                <DisciplineCircle
                  discipline={disc}
                  isPrimary={i === 0}
                  size="md"
                />
                <span className="text-sm text-gray-700">
                  {getDisciplineLabel(disc)}
                </span>
              </span>
            ))}
          </div>

          {/* Decision Context Card */}
          <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 space-y-1.5">
            {decision.who && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
                <span>{decision.who}</span>
              </div>
            )}
            {decision.meeting_title && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
                <span>{decision.meeting_title}</span>
              </div>
            )}
            {(decision.created_at || decision.meeting_date) && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
                <span>{formatDateTime(decision.created_at || decision.meeting_date || '')}</span>
              </div>
            )}
            {decision.timestamp && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
                <span className="font-mono tabular-nums">{formatTimestamp(decision.timestamp)}</span>
                <span>in recording</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-t bg-gray-50/80">
          {['overview', 'transcript', 'similar'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Rationale Card */}
              <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rationale</h3>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-700 leading-relaxed">{decision.why || 'No rationale provided.'}</p>
                </div>
              </section>

              {/* Causation Card */}
              {decision.causation && (
                <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Causation</h3>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm text-gray-700 leading-relaxed">{decision.causation}</p>
                  </div>
                </section>
              )}

              {/* Consensus Card */}
              {consensusEntries.length > 0 && (
                <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Consensus</h3>
                    <span className="text-xs font-medium text-gray-400">
                      {agreeCount}/{totalCount} agree
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    <div className="space-y-2">
                      {consensusEntries.map(([role, value]) => {
                        const stance = getConsensusStatus(value)
                        return (
                          <div key={role} className="flex items-center gap-2">
                            {getStanceIcon(stance)}
                            <span className="text-sm font-medium text-gray-700 capitalize">{role}</span>
                            <span className={`text-sm font-medium uppercase ${getStanceTextColor(stance)}`}>
                              {stance}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </section>
              )}

              {/* Impacts Card — V2 structured impacts */}
              {decision.impacts && (
                <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Impacts</h3>
                  </div>
                  <div className="px-4 py-3">
                    <div className="space-y-2">
                      {decision.impacts.cost_impact && (
                        <div className="flex items-start gap-2.5 rounded-md px-3 py-2 bg-red-50">
                          <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-red-400" />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold uppercase tracking-wide text-red-700">Cost</span>
                            <p className="text-sm text-gray-700 mt-0.5">{decision.impacts.cost_impact}</p>
                          </div>
                        </div>
                      )}
                      {decision.impacts.timeline_impact && (
                        <div className="flex items-start gap-2.5 rounded-md px-3 py-2 bg-amber-50">
                          <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-amber-400" />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">Timeline</span>
                            <p className="text-sm text-gray-700 mt-0.5">{decision.impacts.timeline_impact}</p>
                          </div>
                        </div>
                      )}
                      {decision.impacts.scope_impact && (
                        <div className="flex items-start gap-2.5 rounded-md px-3 py-2 bg-blue-50">
                          <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-blue-400" />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">Scope</span>
                            <p className="text-sm text-gray-700 mt-0.5">{decision.impacts.scope_impact}</p>
                          </div>
                        </div>
                      )}
                      {decision.impacts.risk_level && (
                        <div className="flex items-start gap-2.5 rounded-md px-3 py-2 bg-gray-50">
                          <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-gray-400" />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">Risk Level</span>
                            <p className="text-sm text-gray-700 mt-0.5 capitalize">{decision.impacts.risk_level}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'transcript' && (
            <div className="space-y-2">
              <p className="text-gray-600 text-sm">Meeting transcript and discussion notes would appear here.</p>
              <div className="bg-amber-50 border-l-4 border-amber-200 p-4 mt-4">
                <p className="text-sm text-gray-700">
                  Key discussion point: {decision.statement}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'similar' && (
            <div className="space-y-2">
              <p className="text-gray-600 text-sm">Similar decisions from this project:</p>
              <div className="bg-gray-50 p-4 rounded text-sm text-gray-600">
                Related decisions would be displayed here based on vector similarity.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
