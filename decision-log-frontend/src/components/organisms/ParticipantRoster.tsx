/**
 * ParticipantRoster — Dynamic participant list form.
 * Story 6.2: Frontend — Project Create/Edit Form
 */
import { Plus, Trash2 } from 'lucide-react'
import { DISCIPLINE_LABELS, Discipline } from '../../types/projectItem'

export interface ParticipantRow {
  name: string
  email: string
  discipline: string
  role: string
}

interface ParticipantRosterProps {
  participants: ParticipantRow[]
  onChange: (participants: ParticipantRow[]) => void
}

const DISCIPLINE_OPTIONS = Object.entries(DISCIPLINE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export default function ParticipantRoster({
  participants,
  onChange,
}: ParticipantRosterProps) {
  const addParticipant = () => {
    onChange([...participants, { name: '', email: '', discipline: 'general', role: '' }])
  }

  const removeParticipant = (index: number) => {
    onChange(participants.filter((_, i) => i !== index))
  }

  const updateParticipant = (
    index: number,
    field: keyof ParticipantRow,
    value: string
  ) => {
    const updated = participants.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    )
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Participants</h3>
        <button
          type="button"
          onClick={addParticipant}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
        >
          <Plus className="h-3 w-3" />
          Add Participant
        </button>
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-500 border border-dashed border-gray-300 rounded-md">
          No participants added. Add team members to improve AI discipline inference.
        </div>
      ) : (
        <div className="space-y-2">
          {participants.map((p, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                  placeholder="Name *"
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <input
                  type="email"
                  value={p.email}
                  onChange={(e) => updateParticipant(index, 'email', e.target.value)}
                  placeholder="Email"
                  className="block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <select
                  value={p.discipline}
                  onChange={(e) => updateParticipant(index, 'discipline', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {DISCIPLINE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={p.role}
                  onChange={(e) => updateParticipant(index, 'role', e.target.value)}
                  placeholder="Role"
                  className="block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={() => removeParticipant(index)}
                className="mt-1 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
