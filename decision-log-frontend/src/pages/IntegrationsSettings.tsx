import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Badge, Banner, Button, Dialog, ErrorState, Icons, SkeletonRows, SourceTile } from '../design-system'
import { integrationsService } from '../services/integrationsService'
import { formatFullDate } from '../lib/format'
import { FathomAutoImportSettings } from '../components/organisms/FathomAutoImportSettings'
import { FormContainer } from '../components/templates/PageContainer'

export const FATHOM_STATUS_KEY = 'fathom-status'

/** Error reason for a rejected confirm (403: started by another user, 410: expired). */
function confirmErrorReason(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status === 403) return 'other_user'
  if (status === 410) return 'expired'
  return 'confirm_failed'
}

/**
 * Settings → Integrations (Story 13.3): connect / disconnect the user's own Fathom account.
 * When connected, links to the Fathom meetings page (Story 13.4: browse & import).
 * Promem revamp Phase 4c: settings pattern of the cookbook — form shell, one row per integration
 * (icon, name, status, one action), the destructive disconnect behind a Dialog.
 */
export default function IntegrationsSettings() {
  const { t } = useTranslation('integrations')
  const [params, setParams] = useSearchParams()
  const result = params.get('fathom') // set by the backend OAuth callback
  const reason = params.get('reason')
  const nonce = params.get('nonce')
  const queryClient = useQueryClient()

  // Two-step connect: the callback parked the tokens; claim them with this user's JWT.
  // The backend accepts only the user who started the flow (login-CSRF protection).
  const confirm = useMutation(integrationsService.confirmFathom, {
    onSuccess: data => {
      queryClient.setQueryData(FATHOM_STATUS_KEY, data)
      setParams({ fathom: 'connected' }, { replace: true })
    },
    onError: error => {
      setParams({ fathom: 'error', reason: confirmErrorReason(error) }, { replace: true })
      queryClient.invalidateQueries(FATHOM_STATUS_KEY)
    },
  })
  const confirmedNonce = useRef<string | null>(null)
  const confirmMutate = confirm.mutate
  useEffect(() => {
    // once per nonce (StrictMode runs effects twice; the nonce is single use)
    if (result === 'pending' && nonce && confirmedNonce.current !== nonce) {
      confirmedNonce.current = nonce
      confirmMutate(nonce)
    }
  }, [result, nonce, confirmMutate])

  const { data: status, isLoading, isError, refetch } = useQuery(FATHOM_STATUS_KEY, integrationsService.getFathomStatus)
  const connect = useMutation(integrationsService.connectFathom)
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false)
  const disconnect = useMutation(integrationsService.disconnectFathom, {
    onSuccess: () => {
      setConfirmingDisconnect(false)
      queryClient.invalidateQueries(FATHOM_STATUS_KEY)
    },
  })

  const closeDisconnect = (open: boolean) => {
    if (open) return
    setConfirmingDisconnect(false)
    disconnect.reset()
  }

  const connected = !!status?.connected && !status.needs_reconnect
  const needsReconnect = !!status?.configured && !!status.needs_reconnect
  const notConnected = !!status?.configured && !status.connected

  const Warn = Icons.warning
  let badge: ReactNode = null
  let statusLine: ReactNode = null
  let action: ReactNode = null
  if (status && !status.configured) {
    badge = <Badge tone="muted">{t('fathom.unavailable')}</Badge>
    statusLine = <span>{t('fathom.notConfigured')}</span>
  } else if (notConnected) {
    statusLine = <span>{t('fathom.notConnected')}</span>
    action = (
      <Button variant="primary" icon={<Icons.link />} loading={connect.isLoading} onClick={() => connect.mutate()}>
        {connect.isLoading ? t('fathom.connecting') : t('fathom.connect')}
      </Button>
    )
  } else if (needsReconnect) {
    badge = (
      <Badge tone="warning" icon={<Warn />}>
        {t('fathom.expired')}
      </Badge>
    )
    statusLine = <span className="text-warning-ink">{t('fathom.needsReconnect')}</span>
    action = (
      <Button variant="primary" loading={connect.isLoading} onClick={() => connect.mutate()}>
        {connect.isLoading ? t('fathom.connecting') : t('fathom.reconnect')}
      </Button>
    )
  } else if (status?.configured && connected) {
    badge = (
      <Badge tone="success" icon={<Icons.check />}>
        {t('fathom.connected')}
      </Badge>
    )
    statusLine = (
      <>
        {status.account_label && <span>{t('fathom.connectedAs', { account: status.account_label })}</span>}
        {status.account_label && status.connected_at && <span aria-hidden> · </span>}
        {status.connected_at && <span>{t('fathom.connectedSince', { date: formatFullDate(status.connected_at) })}</span>}
      </>
    )
    action = (
      // Story 13.4: browse & import
      <Button asChild>
        <Link to="/settings/integrations/fathom">{t('fathom.browse')}</Link>
      </Button>
    )
  }

  return (
    <FormContainer>
      <header className="flex flex-col gap-1">
        <p className="text-label uppercase text-ink-2">{t('eyebrow')}</p>
        <h1 className="text-h1 text-ink">{t('title')}</h1>
        <p className="text-small text-ink-2 [text-wrap:pretty]">{t('subtitle')}</p>
      </header>

      {result === 'pending' && (
        <div role="status">
          <Banner>{t('fathom.result.confirming')}</Banner>
        </div>
      )}
      {result === 'connected' && (
        <div role="status">
          <Banner>{t('fathom.result.connected')}</Banner>
        </div>
      )}
      {result === 'error' && (
        <Banner tone="danger">
          {reason === 'other_user'
            ? t('fathom.result.otherUser')
            : reason === 'expired'
              ? t('fathom.result.expired')
              : t('fathom.result.error')}
        </Banner>
      )}

      <section aria-labelledby="integration-fathom" className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3 px-4 py-4 md:px-5">
          <SourceTile type="meeting" />
          <div className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2">
              <h2 id="integration-fathom" className="text-body font-semibold text-ink">
                {t('fathom.name')}
              </h2>
              {badge}
            </span>
            <p className="text-caption text-ink-2">{t('fathom.description')}</p>
            {statusLine && <p className="flex flex-wrap items-center text-caption text-ink-2">{statusLine}</p>}
          </div>
          {action && <div className="flex shrink-0">{action}</div>}
        </div>

        {isLoading && <SkeletonRows rows={2} className="border-t border-line-soft" />}
        {isError && <ErrorState className="border-t border-line-soft py-8" title={t('fathom.errors.load')} onRetry={() => void refetch()} />}

        {/* Story 13.9: opt-in webhook auto-import */}
        {status?.configured && connected && (
          <div className="border-t border-line-soft px-4 py-5 md:px-5">
            <FathomAutoImportSettings settings={status.auto_import} onSaved={() => queryClient.invalidateQueries(FATHOM_STATUS_KEY)} />
          </div>
        )}

        {status?.configured && status.connected && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft bg-surface-2 px-4 py-4 md:px-5">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h3 className="text-small font-semibold text-ink">{t('fathom.disconnectSection')}</h3>
              <p className="text-caption text-ink-2">{t('fathom.disconnectHelp')}</p>
            </div>
            <Button variant="danger-ghost" disabled={disconnect.isLoading} onClick={() => setConfirmingDisconnect(true)}>
              {t('fathom.disconnect')}
            </Button>
          </div>
        )}
      </section>

      {connect.isError && <Banner tone="danger">{t('fathom.errors.action')}</Banner>}

      <Dialog
        open={confirmingDisconnect}
        onOpenChange={closeDisconnect}
        title={t('fathom.disconnectTitle')}
        description={t('fathom.disconnectText')}
        footer={
          <>
            {disconnect.isError && (
              <p role="alert" className="mr-auto text-caption text-danger-ink">
                {t('fathom.errors.disconnect')}
              </p>
            )}
            <Button onClick={() => closeDisconnect(false)}>{t('fathom.cancel')}</Button>
            <Button variant="primary" loading={disconnect.isLoading} onClick={() => disconnect.mutate()}>
              {t('fathom.disconnectConfirm')}
            </Button>
          </>
        }
      />
    </FormContainer>
  )
}
