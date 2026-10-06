import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, Plug } from 'lucide-react'
import { integrationsService } from '../services/integrationsService'
import { formatDate } from '../lib/utils'
import { FathomAutoImportSettings } from '../components/organisms/FathomAutoImportSettings'

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

  const { data: status, isLoading, isError } = useQuery(FATHOM_STATUS_KEY, integrationsService.getFathomStatus)
  const connect = useMutation(integrationsService.connectFathom)
  const disconnect = useMutation(integrationsService.disconnectFathom, {
    onSuccess: () => queryClient.invalidateQueries(FATHOM_STATUS_KEY),
  })

  const handleDisconnect = () => {
    if (window.confirm(t('fathom.confirmDisconnect'))) disconnect.mutate()
  }

  const connected = !!status?.connected && !status.needs_reconnect

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('subtitle')}</p>

        {result === 'pending' && (
          <div role="status" className="mt-6 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {t('fathom.result.confirming')}
          </div>
        )}
        {result === 'connected' && (
          <div role="status" className="mt-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            {t('fathom.result.connected')}
          </div>
        )}
        {result === 'error' && (
          <div role="alert" className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            {reason === 'other_user'
              ? t('fathom.result.otherUser')
              : reason === 'expired'
                ? t('fathom.result.expired')
                : t('fathom.result.error')}
          </div>
        )}

        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Plug className="mt-0.5 h-5 w-5 text-blue-600" aria-hidden />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('fathom.name')}</h2>
                <p className="text-sm text-gray-600">{t('fathom.description')}</p>
              </div>
            </div>
            {connected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                {t('fathom.connected')}
              </span>
            )}
          </div>

          <div className="mt-4 text-sm">
            {isLoading && <p className="text-gray-500">{t('nav:loading')}</p>}
            {isError && <p className="text-red-700">{t('fathom.errors.load')}</p>}
            {status && !status.configured && <p className="text-gray-600">{t('fathom.notConfigured')}</p>}

            {status?.configured && !status.connected && (
              <div className="flex items-center justify-between gap-4">
                <p className="text-gray-600">{t('fathom.notConnected')}</p>
                <ConnectButton label={t('fathom.connect')} busy={connect.isLoading} busyLabel={t('fathom.connecting')} onClick={() => connect.mutate()} />
              </div>
            )}

            {status?.configured && status.needs_reconnect && (
              <div className="flex items-center justify-between gap-4">
                <p className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" aria-hidden />
                  {t('fathom.needsReconnect')}
                </p>
                <div className="flex gap-2">
                  <ConnectButton label={t('fathom.reconnect')} busy={connect.isLoading} busyLabel={t('fathom.connecting')} onClick={() => connect.mutate()} />
                  <DisconnectButton label={t('fathom.disconnect')} disabled={disconnect.isLoading} onClick={handleDisconnect} />
                </div>
              </div>
            )}

            {status?.configured && connected && (
              <div className="flex items-center justify-between gap-4">
                <div className="text-gray-700">
                  {status.account_label && <p>{t('fathom.connectedAs', { account: status.account_label })}</p>}
                  {status.connected_at && (
                    <p className="text-gray-500">{t('fathom.connectedSince', { date: formatDate(status.connected_at) })}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {/* Story 13.4: browse & import */}
                  <Link
                    to="/settings/integrations/fathom"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {t('fathom.browse')}
                  </Link>
                  <DisconnectButton label={t('fathom.disconnect')} disabled={disconnect.isLoading} onClick={handleDisconnect} />
                </div>
              </div>
            )}

            {/* Story 13.9: opt-in webhook auto-import */}
            {status?.configured && connected && (
              <FathomAutoImportSettings
                settings={status.auto_import}
                onSaved={() => queryClient.invalidateQueries(FATHOM_STATUS_KEY)}
              />
            )}

            {(connect.isError || disconnect.isError) && (
              <p role="alert" className="mt-3 text-red-700">{t('fathom.errors.action')}</p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function ConnectButton({ label, busy, busyLabel, onClick }: { label: string; busy: boolean; busyLabel: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
    >
      {busy ? busyLabel : label}
    </button>
  )
}

function DisconnectButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
    >
      {label}
    </button>
  )
}
