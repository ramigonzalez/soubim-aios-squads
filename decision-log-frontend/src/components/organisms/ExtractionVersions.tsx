/**
 * ExtractionVersions — every extraction of a meeting is a version; admins can switch the
 * active one (rollback) or extract again (Story 13.7). Shown on the meeting viewer.
 * Readers see the list; the actions appear only when the API says the user can manage.
 */
import { useState } from 'react'
import { History, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useActivateExtractionRun, useExtractionRuns, useReExtract } from '../../hooks/useExtractionRuns'
import { cn } from '../../lib/utils'

function formatDateTime(value: string | null, locale: string): string {
  if (!value) return '—'
  return new Date(value).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
}

export default function ExtractionVersions({ sourceId }: { sourceId: string }) {
  const { t, i18n } = useTranslation('meeting')
  const { data, isLoading, isError } = useExtractionRuns(sourceId)
  const activate = useActivateExtractionRun(sourceId)
  const reExtract = useReExtract(sourceId)
  const [open, setOpen] = useState(false)

  if (isLoading || isError || !data) return null

  const job = data.latest_job
  const inProgress = job?.status === 'queued' || job?.status === 'running'
  const failed = job?.status === 'failed' && job.last_error
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
  const mutationFailed = activate.isError || reExtract.isError

  const handleActivate = (runId: string, version: number) => {
    if (window.confirm(t('versions.confirmActivate', { version }))) activate.mutate(runId)
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
      >
        <History className="w-4 h-4" aria-hidden="true" />
        {t('versions.button')} ({data.runs.length})
      </button>

      {open && (
        <section
          aria-label={t('versions.heading')}
          className="mt-2 rounded-lg border border-gray-200 bg-white p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs text-gray-500">{t('versions.note')}</p>
            {data.can_manage && (
              <button
                type="button"
                onClick={() => reExtract.mutate()}
                disabled={inProgress || reExtract.isLoading}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={cn('w-4 h-4', inProgress && 'animate-spin')} aria-hidden="true" />
                {inProgress ? t('versions.inProgress') : t('versions.reExtract')}
              </button>
            )}
          </div>

          {failed && <p className="text-sm text-red-600">{t('versions.jobFailed', { error: job?.last_error })}</p>}
          {mutationFailed && <p className="text-sm text-red-600">{t('versions.error')}</p>}

          {data.runs.length === 0 ? (
            <p className="text-sm text-gray-500">{t('versions.empty')}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.runs.map(run => (
                <li key={run.id} className="py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="font-medium text-gray-900">{t('versions.version', { version: run.version })}</span>
                  {run.is_active && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      {t('versions.active')}
                    </span>
                  )}
                  <span className="text-gray-700">{run.model || t('versions.unknownModel')}</span>
                  <span className="text-gray-500">{formatDateTime(run.created_at, locale)}</span>
                  {run.created_by_name && (
                    <span className="text-gray-500">{t('versions.by', { name: run.created_by_name })}</span>
                  )}
                  <span className="text-gray-700">{t('versions.items', { count: run.item_count })}</span>
                  {run.input_tokens != null && run.output_tokens != null && (
                    <span className="text-xs text-gray-400">
                      {t('versions.tokens', { input: run.input_tokens, output: run.output_tokens })}
                    </span>
                  )}
                  {run.estimated_cost_usd != null && (
                    <span className="text-xs text-gray-400">
                      {t('versions.cost', { cost: (run.estimated_cost_usd as number).toFixed(4) })}
                    </span>
                  )}
                  {data.can_manage && !run.is_active && (
                    <button
                      type="button"
                      onClick={() => handleActivate(run.id, run.version)}
                      disabled={activate.isLoading}
                      className="ml-auto text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      {activate.isLoading && activate.variables === run.id ? t('versions.activating') : t('versions.activate')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
