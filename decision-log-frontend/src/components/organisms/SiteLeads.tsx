/**
 * Pedidos do site (Promem revamp Phase 5): demo / pilot requests from the landing page form, newest
 * first, for the platform operator. "Marcar como atendido" applies at once with "Desfazer".
 */
import { useTranslation } from 'react-i18next'
import { Badge, Banner, Button, EmptyState, ErrorState, Icons, SkeletonRows, useToast } from '../../design-system'
import { formatPhone, useSetLeadHandled, useSiteLeads, type SiteLead } from '../../hooks/useLeads'
import { formatDayTime } from '../../lib/format'

export function SiteLeads() {
  const { t } = useTranslation('platform')
  const toast = useToast()
  const { data: leads = [], isLoading, isError, refetch } = useSiteLeads()
  const setHandled = useSetLeadHandled()
  const open = leads.filter((l) => !l.handled_at).length

  const toggle = (lead: SiteLead, handled: boolean) =>
    setHandled.mutate(
      { id: lead.id, handled },
      {
        onSuccess: () => {
          if (handled)
            toast.show({ message: t('leads.handledToast', { name: lead.name }), tone: 'success', onUndo: () => setHandled.mutate({ id: lead.id, handled: false }) })
        },
      },
    )

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 md:p-6" aria-labelledby="site-leads">
      <div className="flex flex-col gap-1">
        <h2 id="site-leads" className="text-h3 text-ink">
          {t('leads.title')}
        </h2>
        <p className="text-caption text-ink-2">{t('leads.subtitle')}</p>
        {leads.length > 0 && <p className="text-caption text-ink-2">{t('leads.count', { count: leads.length, open })}</p>}
      </div>
      {setHandled.isError && <Banner tone="danger">{t('leads.updateError')}</Banner>}
      {isLoading ? (
        <SkeletonRows rows={3} rowClassName="h-row-2" />
      ) : isError ? (
        <ErrorState title={t('leads.error')} onRetry={() => void refetch()} className="py-6" />
      ) : leads.length === 0 ? (
        <EmptyState icon={<Icons.email />} title={t('leads.empty')} text={t('leads.emptyText')} />
      ) : (
        <ul className="flex flex-col divide-y divide-line-soft rounded-lg border border-line">
          {leads.map((lead) => (
            <li key={lead.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-body font-semibold text-ink">{lead.name}</span>
                  <span className="text-small text-ink-2">{lead.company}</span>
                  <Badge tone={lead.mode === 'pilot' ? 'accent' : 'neutral'}>{t(`leads.mode.${lead.mode}`)}</Badge>
                  {lead.handled_at && <Badge tone="success">{t('leads.handledBadge')}</Badge>}
                </p>
                <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-caption text-ink-2">
                  <a href={`mailto:${lead.email}`} className="ds-touch text-accent hover:text-accent-strong">
                    {lead.email}
                  </a>
                  <a href={`https://wa.me/55${lead.whatsapp}`} target="_blank" rel="noopener noreferrer" className="ds-touch text-accent hover:text-accent-strong">
                    {t('leads.whatsapp', { phone: formatPhone(lead.whatsapp) })}
                  </a>
                  {lead.role && <span>{t(`leads.role.${lead.role}`)}</span>}
                  {lead.team_size && <span>{t(`leads.teamSize.${lead.team_size}`)}</span>}
                </p>
                {lead.handled_at && (
                  <p className="text-caption text-ink-3">
                    {lead.handled_by
                      ? t('leads.handled', { name: lead.handled_by, date: formatDayTime(lead.handled_at) })
                      : t('leads.handledOn', { date: formatDayTime(lead.handled_at) })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-mono-sm text-ink-2">{formatDayTime(lead.created_at)}</span>
                <Button size="sm" variant={lead.handled_at ? 'ghost' : 'secondary'} onClick={() => toggle(lead, !lead.handled_at)}>
                  {lead.handled_at ? t('leads.reopen') : t('leads.markHandled')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
