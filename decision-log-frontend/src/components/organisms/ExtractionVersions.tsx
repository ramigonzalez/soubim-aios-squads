/**
 * ExtractionVersions — every extraction of a meeting is a version; admins can switch the
 * active one (rollback, confirmed in a Dialog) or extract again (Story 13.7). Shown on the
 * meeting viewer under "Versões da extração", on the Promem design system.
 * Readers see the list; the actions appear only when the API says the user can manage.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Banner, Button, Dialog, Icons, SkeletonRows } from '../../design-system'
import { useActivateExtractionRun, useExtractionRuns, useReExtract } from '../../hooks/useExtractionRuns'

function formatDateTime(value: string | null, locale: string): string {
  if (!value) return '—'
  return new Date(value).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
}

export default function ExtractionVersions({ sourceId }: { sourceId: string }) {
  const { t, i18n } = useTranslation('meeting')
  const { data, isLoading, isError, refetch } = useExtractionRuns(sourceId)
  const activate = useActivateExtractionRun(sourceId)
  const reExtract = useReExtract(sourceId)
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState<{ runId: string; version: number } | null>(null)

  if (isLoading) return <SkeletonRows rows={1} className="rounded-lg border border-line" />
  if (isError || !data) {
    return (
      <Banner
        tone="danger"
        action={
          refetch ? (
            <Button size="sm" variant="link" onClick={() => void refetch()}>
              {t('ui:state.retry')}
            </Button>
          ) : undefined
        }
      >
        {t('versions.loadError')}
      </Banner>
    )
  }

  const job = data.latest_job
  const inProgress = job?.status === 'queued' || job?.status === 'running'
  const failed = job?.status === 'failed' && job.last_error
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
  const mutationFailed = activate.isError || reExtract.isError
  const HistoryIcon = Icons.history

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="sm"
        variant="ghost"
        icon={<HistoryIcon />}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="-ml-3 self-start"
      >
        {t('versions.button')} ({data.runs.length})
      </Button>

      {open && (
        <section aria-label={t('versions.heading')} className="flex flex-col rounded-lg border border-line bg-surface">
          <div className="flex flex-col gap-3 border-b border-line-soft px-4 py-3 md:flex-row md:items-start md:justify-between">
            <p className="text-caption text-ink-2">{t('versions.note')}</p>
            {data.can_manage && (
              <Button size="sm" onClick={() => reExtract.mutate()} disabled={inProgress || reExtract.isLoading} className="self-start">
                {inProgress ? t('versions.inProgress') : t('versions.reExtract')}
              </Button>
            )}
          </div>

          {(failed || mutationFailed) && (
            <div className="flex flex-col gap-2 border-b border-line-soft px-4 py-3">
              {failed && <Banner tone="danger">{t('versions.jobFailed', { error: job?.last_error })}</Banner>}
              {mutationFailed && <Banner tone="danger">{t('versions.error')}</Banner>}
            </div>
          )}

          {data.runs.length === 0 ? (
            <p className="px-4 py-5 text-center text-small text-ink-2">{t('versions.empty')}</p>
          ) : (
            <ul>
              {data.runs.map((run) => (
                <li
                  key={run.id}
                  className="flex min-h-row-2 flex-wrap items-center gap-x-4 gap-y-1 border-b border-line-soft px-4 py-2.5 text-small last:border-b-0"
                >
                  <span className="font-semibold text-ink">{t('versions.version', { version: run.version })}</span>
                  {run.is_active && (
                    <Badge tone="success" icon={<Icons.check />}>
                      {t('versions.active')}
                    </Badge>
                  )}
                  <span className="text-ink-soft">{run.model || t('versions.unknownModel')}</span>
                  <span className="font-mono text-mono text-ink-2">{formatDateTime(run.created_at, locale)}</span>
                  {run.created_by_name && <span className="text-ink-2">{t('versions.by', { name: run.created_by_name })}</span>}
                  <span className="text-ink-soft">{t('versions.items', { count: run.item_count })}</span>
                  {run.input_tokens != null && run.output_tokens != null && (
                    <span className="font-mono text-mono-sm text-ink-3">
                      {t('versions.tokens', { input: run.input_tokens, output: run.output_tokens })}
                    </span>
                  )}
                  {run.estimated_cost_usd != null ? (
                    <span className="font-mono text-mono-sm text-ink-3">
                      {t('versions.cost', { cost: (run.estimated_cost_usd as number).toFixed(4) })}
                    </span>
                  ) : (
                    // Story 13.17: tokens known but the model has no MODEL_PRICING entry
                    run.input_tokens != null &&
                    run.output_tokens != null && <span className="text-caption text-ink-3">{t('versions.costUnknown')}</span>
                  )}
                  {data.can_manage && !run.is_active && (
                    <Button
                      size="sm"
                      variant="link"
                      onClick={() => setConfirming({ runId: run.id, version: run.version })}
                      disabled={activate.isLoading}
                      className="ml-auto"
                    >
                      {activate.isLoading && activate.variables === run.id ? t('versions.activating') : t('versions.activate')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Dialog
        open={!!confirming}
        onOpenChange={(o) => !o && setConfirming(null)}
        title={t('versions.activateTitle', { version: confirming?.version })}
        description={t('versions.confirmActivate', { version: confirming?.version })}
        footer={
          <>
            <Button onClick={() => setConfirming(null)}>{t('common:cancel')}</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (confirming) activate.mutate(confirming.runId)
                setConfirming(null)
              }}
            >
              {t('versions.activateAction', { version: confirming?.version })}
            </Button>
          </>
        }
      />
    </div>
  )
}
