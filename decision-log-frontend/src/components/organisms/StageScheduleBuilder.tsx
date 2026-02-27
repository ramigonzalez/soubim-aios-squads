/**
 * StageScheduleBuilder — Dynamic stage schedule form with template loading.
 * Story 6.2: Frontend — Project Create/Edit Form
 */
import { Plus, Trash2, FileDown } from 'lucide-react'
import { useStageTemplates, StageTemplate } from '../../hooks/useStageTemplates'

export interface StageRow {
  stage_name: string
  stage_from: string
  stage_to: string
}

interface StageScheduleBuilderProps {
  stages: StageRow[]
  onChange: (stages: StageRow[]) => void
  errors?: Record<number, string>
}

function addDays(date: Date, days: number): string {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result.toISOString().split('T')[0]
}

export default function StageScheduleBuilder({
  stages,
  onChange,
  errors,
}: StageScheduleBuilderProps) {
  const { data: templatesData } = useStageTemplates()

  const addStage = () => {
    onChange([...stages, { stage_name: '', stage_from: '', stage_to: '' }])
  }

  const removeStage = (index: number) => {
    onChange(stages.filter((_, i) => i !== index))
  }

  const updateStage = (index: number, field: keyof StageRow, value: string) => {
    const updated = stages.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    )
    onChange(updated)
  }

  const loadTemplate = (template: StageTemplate) => {
    if (stages.length > 0 && !window.confirm('This will replace existing stages. Continue?')) {
      return
    }
    let startDate = new Date()
    const newStages: StageRow[] = template.stages.map((ts) => {
      const from = startDate.toISOString().split('T')[0]
      const to = addDays(startDate, ts.default_duration_days)
      startDate = new Date(to)
      startDate.setDate(startDate.getDate() + 1)
      return {
        stage_name: ts.stage_name,
        stage_from: from,
        stage_to: to,
      }
    })
    onChange(newStages)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Stage Schedule</h3>
        <div className="flex gap-2">
          {templatesData?.templates && templatesData.templates.length > 0 && (
            <div className="relative group">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded px-2 py-1"
              >
                <FileDown className="h-3 w-3" />
                Load Template
              </button>
              <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[200px]">
                {templatesData.templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => loadTemplate(t)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    {t.template_name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={addStage}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-3 w-3" />
            Add Stage
          </button>
        </div>
      </div>

      {stages.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-500 border border-dashed border-gray-300 rounded-md">
          No stages defined. Add stages or load a template.
        </div>
      ) : (
        <div className="space-y-2">
          {stages.map((stage, index) => (
            <div key={index}>
              <div className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={stage.stage_name}
                    onChange={(e) => updateStage(index, 'stage_name', e.target.value)}
                    placeholder="Stage name"
                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={stage.stage_from}
                    onChange={(e) => updateStage(index, 'stage_from', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={stage.stage_to}
                    onChange={(e) => updateStage(index, 'stage_to', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeStage(index)}
                  className="mt-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {errors?.[index] && (
                <p className="text-xs text-red-600 mt-1">{errors[index]}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
