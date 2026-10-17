/**
 * FathomRulesSection — the project's Fathom routing rules (Story 13.16), on the Promem design system.
 *
 * A Fathom webhook meeting goes to this project when it matches any rule (title contains, participant
 * email is, participant domain is). Lists, adds and removes rules. Shown on the Project Edit page as a
 * section card that saves on its own; renders nothing when the user cannot manage rules (API 403: only
 * project admins and reviewers can).
 */
import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Banner, Button, ErrorState, Field, IconButton, Icons, Input, Select, SkeletonRows } from '../../design-system'
import { integrationsService } from '../../services/integrationsService'
import type { FathomRule, FathomRuleField } from '../../types/integrations'
import { FormSection } from '../templates/FormShell'

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
  const { data: rules, isLoading, isError, error: loadError, refetch } = useQuery<FathomRule[]>(
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

  if (isError && (loadError as { response?: { status?: number } } | null)?.response?.status === 403) return null

  const section = (children: ReactNode) => (
    <FormSection
      title={t('fathomRules.title')}
      description={
        <>
          {t('fathomRules.description')}
          <span className="block text-ink-3">{t('settings.autoSaved')}</span>
        </>
      }
    >
      {children}
    </FormSection>
  )

  if (isLoading) return section(<SkeletonRows rows={2} className="rounded-lg border border-line" />)
  if (isError || !rules) {
    return section(<ErrorState className="py-6" title={t('fathomRules.loadError')} onRetry={() => void refetch()} />)
  }

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

  return section(
    <>
      {error && <Banner tone="danger">{error}</Banner>}

      {rules.length === 0 ? (
        <p className="rounded-md border border-dashed border-line-strong px-4 py-5 text-center text-small text-ink-2">{t('fathomRules.empty')}</p>
      ) : (
        <ul className="rounded-lg border border-line" aria-label={t('fathomRules.title')}>
          {rules.map((rule) => {
            const label = `${t(`fathomRules.fields.${rule.field}`)} "${rule.value}"`
            return (
              <li key={rule.id} className="flex min-h-row items-center justify-between gap-3 border-b border-line-soft py-1 pl-4 pr-2 last:border-b-0">
                <span className="min-w-0 truncate text-small">
                  <span className="text-ink-2">{t(`fathomRules.fields.${rule.field}`)}</span>{' '}
                  <span className="font-medium text-ink">{rule.value}</span>
                </span>
                <IconButton
                  label={t('fathomRules.remove', { rule: label })}
                  icon={<Icons.remove />}
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleRemove(rule.id)}
                  disabled={remove.isLoading}
                />
              </li>
            )
          })}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-col gap-3 md:flex-row md:items-end">
        <Field label={t('fathomRules.field')} className="md:w-56">
          <Select
            value={field}
            onValueChange={(v) => setField(v as FathomRuleField)}
            options={FIELDS.map((f) => ({ value: f, label: t(`fathomRules.fields.${f}`) }))}
          />
        </Field>
        <Field label={t('fathomRules.value')} className="min-w-0 flex-1">
          <Input
            type="text"
            value={value}
            maxLength={MAX_LENGTH + 20}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t(`fathomRules.placeholders.${field}`)}
          />
        </Field>
        <Button type="submit" icon={<Icons.add />} disabled={create.isLoading || !value.trim()} className="md:mb-px">
          {t('fathomRules.add')}
        </Button>
      </form>
    </>,
  )
}
