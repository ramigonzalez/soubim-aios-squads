import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { changePasswordErrorKey, useChangePassword } from '../hooks/useChangePassword'

/** Same minimum as the backend (invitation accept, Story 12.5). */
export const PASSWORD_MIN_LENGTH = 8

/**
 * Settings → change password (Story 12.13): current, new and confirmation. The API checks the current
 * password and the rules again; reset by email waits for Story 12.14.
 */
export default function ChangePassword() {
  const { t } = useTranslation('auth')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const change = useChangePassword()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setDone(false)
    change.reset()
    if (next.length < PASSWORD_MIN_LENGTH) return setLocalError('changePassword.errors.password_too_short')
    if (next !== confirm) return setLocalError('changePassword.errors.mismatch')
    if (next === current) return setLocalError('changePassword.errors.password_unchanged')
    setLocalError(null)
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setDone(true)
          setCurrent('')
          setNext('')
          setConfirm('')
        },
      }
    )
  }

  const errorKey = localError ?? (change.isError ? changePasswordErrorKey(change.error) : null)
  const field = 'mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm'

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 sm:px-6 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">{t('changePassword.title')}</h1>
          <p className="mt-1 text-sm text-gray-600">{t('changePassword.subtitle')}</p>
        </header>
        <form onSubmit={submit} className="bg-white rounded-lg border border-gray-200 p-4 space-y-4" noValidate>
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
              {t('changePassword.current')}
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={e => setCurrent(e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
              {t('changePassword.new')}
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              value={next}
              onChange={e => setNext(e.target.value)}
              className={field}
            />
            <p className="mt-1 text-xs text-gray-500">{t('changePassword.hint', { n: PASSWORD_MIN_LENGTH })}</p>
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
              {t('changePassword.confirm')}
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className={field}
            />
          </div>
          {errorKey && (
            <p role="alert" className="text-sm text-red-700">
              {t(errorKey, { n: PASSWORD_MIN_LENGTH })}
            </p>
          )}
          {done && (
            <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
              {t('changePassword.success')}
            </p>
          )}
          <button
            type="submit"
            disabled={change.isLoading || !current || !next || !confirm}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {change.isLoading ? t('changePassword.saving') : t('changePassword.submit')}
          </button>
        </form>
      </div>
    </main>
  )
}
