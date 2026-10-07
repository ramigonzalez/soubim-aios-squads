/**
 * FathomRulesSection — the project's Fathom routing rules (Story 13.16).
 *
 * A Fathom webhook meeting goes to this project when it matches any rule (title contains, participant
 * email is, participant domain is). Lists, adds and removes rules. Shown on the Project Edit page;
 * renders nothing when the user cannot manage rules (API 403: only project admins and reviewers can).
 */
import { FormEvent, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { integrationsService } from '../../services/integrationsService'
import type { FathomRule, FathomRuleField } from '../../types/integrations'

const FIELDS: FathomRuleField[] = ['title', 'participant_email', 'participant_domain']
const MAX_LENGTH = 200

export const fathomRulesKey = (projectId: string) => ['fathom-rules', projectId]

function errorKey(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status === 422) return 'fathomRules.errors.invalid'
  if (status === 409) return 'fathomRules.errors.duplicate'
  return 'fathomRules.errors.generic'
}

/** Same checks as the API, so most mistakes are caught before the request */
function invalid(field: FathomRuleField, value: string): boolean {
  const v = value.trim()
  if (!v || v.length > MAX_LENGTH) return true
  if (field === 'participant_domain') return v.includes('@') || /\s/.test(v)
  if (field === 'participant_email') return v.split('@').length !== 2 || v.startsWith('@') || v.endsWith('@') || /\s/.test(v)
  return false
}

export default function FathomRulesSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('projects')
  const queryClient = useQueryClient()
  const { data: rules, isLoading, isError } = useQuery<FathomRule[]>(
    fathomRulesKey(projectId),
    () => integrationsService.listFathomRules(projectId),
    { enabled: !!projectId, retry: false },
  )
  const [field, setField] = useState<FathomRuleField>('title')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refresh = () => queryClient.invalidateQueries(fathomRulesKey(projectId))
  const create = useMutation(
    (body: { field: FathomRuleField; value: string }) => integrationsService.createFathomRule(projectId, body),
    { onSuccess: refresh },
  )
  const remove = useMutation((ruleId: string) => integrationsService.deleteFathomRule(projectId, ruleId), { onSuccess: refresh })

  if (isLoading || isError || !rules) return null

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (invalid(field, value)) {
      setError(t('fathomRules.errors.invalid'))
      return
    }
    try {
      await create.mutateAsync({ field, value: value.trim() })
      setValue('')
    } catch (err) {
      setError(t(errorKey(err)))
    }
  }

  const handleRemove = async (ruleId: string) => {
    setError(null)
    try {
      await remove.mutateAsync(ruleId)
    } catch (err) {
      setError(t(errorKey(err)))
    }
  }

  return (
    <section className="mt-10 pt-6 border-t border-gray-200 space-y-4" aria-labelledby="fathom-rules-title">
      <div>
        <h2 id="fathom-rules-title" className="text-lg font-medium text-gray-900">{t('fathomRules.title')}</h2>
        <p className="text-sm text-gray-500">{t('fathomRules.description')}</p>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}

      {rules.length === 0 ? (
        <p className="text-sm text-gray-500">{t('fathomRules.empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-100" aria-label={t('fathomRules.title')}>
          {rules.map(rule => {
            const label = `${t(`fathomRules.fields.${rule.field}`)} "${rule.value}"`
            return (
              <li key={rule.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="text-gray-500">{t(`fathomRules.fields.${rule.field}`)}</span>{' '}
                  <span className="font-medium text-gray-900">{rule.value}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(rule.id)}
                  disabled={remove.isLoading}
                  aria-label={t('fathomRules.remove', { rule: label })}
                  title={t('fathomRules.remove', { rule: label })}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="block font-medium text-gray-700">{t('fathomRules.field')}</span>
          <select
            value={field}
            onChange={e => setField(e.target.value as FathomRuleField)}
            className="mt-1 block rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {FIELDS.map(f => <option key={f} value={f}>{t(`fathomRules.fields.${f}`)}</option>)}
          </select>
        </label>
        <label className="text-sm flex-1 min-w-[12rem]">
          <span className="block font-medium text-gray-700">{t('fathomRules.value')}</span>
          <input
            type="text"
            value={value}
            maxLength={MAX_LENGTH + 20}
            onChange={e => setValue(e.target.value)}
            placeholder={t(`fathomRules.placeholders.${field}`)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </label>
        <button
          type="submit"
          disabled={create.isLoading || !value.trim()}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {t('fathomRules.add')}
        </button>
      </form>
    </section>
  )
}
