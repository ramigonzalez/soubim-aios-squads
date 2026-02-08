import { useState } from 'react'
import { Decision } from '../../types/decision'
import { DisciplineBadge } from '../molecules/DisciplineBadge'
import { formatDateTime } from '../../lib/utils'
import { X } from 'lucide-react'

interface DrilldownModalProps {
  decision: Decision | null
  onClose: () => void
}

export function DrilldownModal({ decision, onClose }: DrilldownModalProps) {
  const [activeTab, setActiveTab] = useState('overview')

  if (!decision) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{decision.decision_statement}</h2>
            <div className="flex items-center gap-2 mt-2">
              <DisciplineBadge discipline={decision.discipline} />
              {(decision.created_at || decision.meeting_date) && (
                <span className="text-sm text-gray-500">{formatDateTime(decision.created_at || decision.meeting_date || '')}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {['overview', 'transcript', 'similar'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
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
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Rationale</h3>
                <p className="text-gray-700">{decision.why}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Causation</h3>
                <p className="text-gray-700">{decision.causation}</p>
              </div>
              {decision.impacts && decision.impacts.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Impacts</h3>
                  <ul className="space-y-2">
                    {decision.impacts.map((impact, idx) => (
                      <li key={idx} className="text-sm text-gray-700">
                        <span className="font-medium capitalize">{impact.type}:</span> {impact.change}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {decision.consensus && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Consensus</h3>
                  <div className="space-y-1">
                    {typeof decision.consensus === 'object' && Object.entries(decision.consensus).map(([role, stance]) => (
                      <div key={role} className="text-sm text-gray-700">
                        <span className="font-medium capitalize">{role}:</span> {stance}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transcript' && (
            <div className="space-y-2">
              <p className="text-gray-600 text-sm">Meeting transcript and discussion notes would appear here.</p>
              <div className="bg-amber-50 border-l-4 border-amber-200 p-4 mt-4">
                <p className="text-sm text-gray-700">
                  Key discussion point: {decision.decision_statement}
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
