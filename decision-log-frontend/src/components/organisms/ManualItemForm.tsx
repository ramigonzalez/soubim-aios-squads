/**
 * ManualItemForm — Form for manually creating project items.
 * Story 7.3: Manual Input — Create Project Item Form
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateProjectItem } from '../../hooks/useProjectItemMutation'
import { useParticipants } from '../../hooks/useParticipants'
import {
  ItemType,
  Discipline,
  ConsensusEntry,
  ConsensusMap,
  ITEM_TYPE_LABELS,
  DISCIPLINE_LABELS,
  ALL_DISCIPLINES,
  ProjectItemCreate,
} from '../../types/projectItem'

interface ManualItemFormProps {
  projectId: string
}

interface ConsensusFormEntry {
  status: 'AGREE' | 'DISAGREE' | 'ABSTAIN' | ''
  notes: string
}

interface FormErrors {
  statement?: string
  itemType?: string
  affectedDisciplines?: string
  who?: string
  date?: string
}

function getTodayString(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const ITEM_TYPE_OPTIONS: { value: ItemType; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'topic', label: 'Topic' },
  { value: 'decision', label: 'Decision' },
  { value: 'action_item', label: 'Action Item' },
  { value: 'information', label: 'Information' },
]

export default function ManualItemForm({ projectId }: ManualItemFormProps) {
  const navigate = useNavigate()
  const createMutation = useCreateProjectItem(projectId)
  const { data: participants } = useParticipants(projectId)

  // Form state
  const [statement, setStatement] = useState('')
  const [itemType, setItemType] = useState<ItemType | ''>('')
  const [affectedDisciplines, setAffectedDisciplines] = useState<Discipline[]>([])
  const [who, setWho] = useState('')
  const [date, setDate] = useState(getTodayString())
  const [contextNotes, setContextNotes] = useState('')

  // Conditional: action_item
  const [owner, setOwner] = useState('')
  const [dueDate, setDueDate] = useState('')

  // Conditional: decision
  const [consensus, setConsensus] = useState<Partial<Record<Discipline, ConsensusFormEntry>>>({})

  // Errors
  const [errors, setErrors] = useState<FormErrors>({})
  const [apiError, setApiError] = useState('')

  // Sync consensus entries when affectedDisciplines changes
  useEffect(() => {
    if (itemType !== 'decision') return
    setConsensus((prev) => {
      const updated: Partial<Record<Discipline, ConsensusFormEntry>> = {}
      affectedDisciplines.forEach((d) => {
        updated[d] = prev[d] ?? { status: '', notes: '' }
      })
      return updated
    })
  }, [affectedDisciplines, itemType])

  function toggleDiscipline(d: Discipline) {
    setAffectedDisciplines((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    )
  }

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!statement.trim()) errs.statement = 'Statement is required'
    if (!itemType) errs.itemType = 'Item type is required'
    if (affectedDisciplines.length === 0)
      errs.affectedDisciplines = 'Select at least one discipline'
    if (!who.trim()) errs.who = 'Who is required'
    if (!date) errs.date = 'Date is required'
    return errs
  }

  function buildPayload(): ProjectItemCreate {
    const payload: ProjectItemCreate = {
      statement: statement.trim(),
      item_type: itemType as ItemType,
      affected_disciplines: affectedDisciplines,
      who: who.trim(),
      date,
      source_type: 'manual_input',
      context_notes: contextNotes.trim() || undefined,
    }

    if (itemType === 'action_item') {
      payload.owner = owner.trim() || undefined
      payload.due_date = dueDate || undefined
    }

    if (itemType === 'decision') {
      const consensusMap: ConsensusMap = {}
      Object.entries(consensus).forEach(([disc, entry]) => {
        if (entry.status) {
          consensusMap[disc as Discipline] = {
            status: entry.status as ConsensusEntry['status'],
            notes: entry.notes || null,
          }
        }
      })
      if (Object.keys(consensusMap).length > 0) {
        payload.consensus = consensusMap
      }
    }

    return payload
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError('')

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})

    try {
      const item = await createMutation.mutateAsync(buildPayload())
      navigate(`/projects/${projectId}/history?highlight=${item.id}`)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      setApiError(
        e?.response?.data?.detail || e?.message || 'Failed to save item. Please try again.'
      )
    }
  }

  function updateConsensusStatus(d: Discipline, status: ConsensusFormEntry['status']) {
    setConsensus((prev) => ({
      ...prev,
      [d]: { ...prev[d]!, status },
    }))
  }

  function updateConsensusNotes(d: Discipline, notes: string) {
    setConsensus((prev) => ({
      ...prev,
      [d]: { ...prev[d]!, notes },
    }))
  }

  const inputBaseClass =
    'border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full'
  const inputErrorClass =
    'border border-red-500 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 w-full'

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Statement */}
      <div>
        <label htmlFor="statement" className="block text-sm font-medium text-gray-700 mb-1">
          Statement <span className="text-red-500 ml-0.5">*</span>
        </label>
        <textarea
          id="statement"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="Describe the item in one or two sentences"
          rows={3}
          aria-required="true"
          aria-describedby={errors.statement ? 'statement-error' : undefined}
          className={errors.statement ? inputErrorClass : inputBaseClass}
        />
        {errors.statement && (
          <p id="statement-error" className="text-sm text-red-600 mt-1">
            {errors.statement}
          </p>
        )}
      </div>

      {/* Item Type */}
      <div>
        <label htmlFor="itemType" className="block text-sm font-medium text-gray-700 mb-1">
          Item Type <span className="text-red-500 ml-0.5">*</span>
        </label>
        <select
          id="itemType"
          value={itemType}
          onChange={(e) => setItemType(e.target.value as ItemType | '')}
          aria-required="true"
          aria-describedby={errors.itemType ? 'itemType-error' : undefined}
          className={errors.itemType ? inputErrorClass : inputBaseClass}
        >
          <option value="">Select item type...</option>
          {ITEM_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.itemType && (
          <p id="itemType-error" className="text-sm text-red-600 mt-1">
            {errors.itemType}
          </p>
        )}
      </div>

      {/* Affected Disciplines */}
      <fieldset>
        <legend className="block text-sm font-medium text-gray-700 mb-1">
          Affected Disciplines <span className="text-red-500 ml-0.5">*</span>
        </legend>
        <div
          className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-gray-200 rounded-md p-3 max-h-60 overflow-y-auto"
          role="group"
          aria-required="true"
          aria-describedby={errors.affectedDisciplines ? 'disciplines-error' : undefined}
        >
          {ALL_DISCIPLINES.map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={affectedDisciplines.includes(d)}
                onChange={() => toggleDiscipline(d)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {DISCIPLINE_LABELS[d]}
            </label>
          ))}
        </div>
        {errors.affectedDisciplines && (
          <p id="disciplines-error" className="text-sm text-red-600 mt-1">
            {errors.affectedDisciplines}
          </p>
        )}
      </fieldset>

      {/* Who */}
      <div>
        <label htmlFor="who" className="block text-sm font-medium text-gray-700 mb-1">
          Who <span className="text-red-500 ml-0.5">*</span>
        </label>
        <input
          id="who"
          type="text"
          list="participants-list"
          value={who}
          onChange={(e) => setWho(e.target.value)}
          placeholder="Name or role"
          aria-required="true"
          aria-describedby={errors.who ? 'who-error' : undefined}
          className={errors.who ? inputErrorClass : inputBaseClass}
        />
        <datalist id="participants-list">
          {participants?.map((p) => (
            <option key={p.id} value={p.name} />
          ))}
        </datalist>
        {errors.who && (
          <p id="who-error" className="text-sm text-red-600 mt-1">
            {errors.who}
          </p>
        )}
      </div>

      {/* Date */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
          Date <span className="text-red-500 ml-0.5">*</span>
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-required="true"
          aria-describedby={errors.date ? 'date-error' : undefined}
          className={errors.date ? inputErrorClass : inputBaseClass}
        />
        {errors.date && (
          <p id="date-error" className="text-sm text-red-600 mt-1">
            {errors.date}
          </p>
        )}
      </div>

      {/* Context Notes */}
      <div>
        <label htmlFor="contextNotes" className="block text-sm font-medium text-gray-700 mb-1">
          Context / Notes
        </label>
        <textarea
          id="contextNotes"
          value={contextNotes}
          onChange={(e) => setContextNotes(e.target.value)}
          placeholder="Additional context, meeting reference, or source description"
          rows={2}
          className={inputBaseClass}
        />
      </div>

      {/* Conditional: Action Item fields */}
      {itemType === 'action_item' && (
        <>
          <div>
            <label htmlFor="owner" className="block text-sm font-medium text-gray-700 mb-1">
              Owner <span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              id="owner"
              type="text"
              list="owner-participants-list"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Person responsible"
              aria-required="true"
              className={inputBaseClass}
            />
            <datalist id="owner-participants-list">
              {participants?.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputBaseClass}
            />
          </div>
        </>
      )}

      {/* Conditional: Decision consensus section */}
      {itemType === 'decision' && affectedDisciplines.length > 0 && (
        <div>
          <h3 className="block text-sm font-medium text-gray-700 mb-2">Consensus</h3>
          <div className="space-y-3 border border-gray-200 rounded-md p-4">
            {affectedDisciplines.map((d) => (
              <div key={d} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm font-medium text-gray-700 min-w-[120px]">
                  {DISCIPLINE_LABELS[d]}
                </span>
                <select
                  value={consensus[d]?.status || ''}
                  onChange={(e) =>
                    updateConsensusStatus(d, e.target.value as ConsensusFormEntry['status'])
                  }
                  aria-label={`${DISCIPLINE_LABELS[d]} consensus status`}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="AGREE">Agree</option>
                  <option value="DISAGREE">Disagree</option>
                  <option value="ABSTAIN">Abstain</option>
                </select>
                <input
                  type="text"
                  value={consensus[d]?.notes || ''}
                  onChange={(e) => updateConsensusNotes(d, e.target.value)}
                  placeholder="Notes (optional)"
                  aria-label={`${DISCIPLINE_LABELS[d]} consensus notes`}
                  className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Error Banner */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {apiError}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t pt-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createMutation.isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isLoading ? 'Saving...' : 'Save Item'}
        </button>
      </div>
    </form>
  )
}
