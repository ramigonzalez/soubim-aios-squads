/**
 * ParticipantRoster — Dynamic participant list form.
 * Story 6.2: Frontend — Project Create/Edit Form
 */
import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ALL_DISCIPLINES } from '../../types/projectItem'
import { getDisciplineLabel } from '../../lib/utils'

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

export default function ParticipantRoster({
  participants,
  onChange,
}: ParticipantRosterProps) {
  const { t } = useTranslation('projects')
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
        <h3 className="text-sm font-medium text-gray-700">{t('participants.title')}</h3>
        <button
          type="button"
          onClick={addParticipant}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
        >
          <Plus className="h-3 w-3" />
          {t('participants.add')}
        </button>
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-500 border border-dashed border-gray-300 rounded-md">
          {t('participants.empty')}
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
                  placeholder={t('participants.namePlaceholder')}
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <input
                  type="email"
                  value={p.email}
                  onChange={(e) => updateParticipant(index, 'email', e.target.value)}
                  placeholder={t('participants.emailPlaceholder')}
                  className="block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <select
                  value={p.discipline}
                  onChange={(e) => updateParticipant(index, 'discipline', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {ALL_DISCIPLINES.map((value) => (
                    <option key={value} value={value}>
                      {getDisciplineLabel(value)}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={p.role}
                  onChange={(e) => updateParticipant(index, 'role', e.target.value)}
                  placeholder={t('participants.rolePlaceholder')}
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
