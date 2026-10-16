import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { changePasswordErrorKey, useChangePassword } from '../hooks/useChangePassword'
import { Banner, Button, Field, Input } from '../design-system'
import { FormSection, FormShell } from '../components/templates/FormShell'

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

  // editing a field hides the previous validation or API error
  const edit = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value)
    setLocalError(null)
    if (change.isError) change.reset()
  }

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

  return (
    <FormShell
      eyebrow={t('changePassword.eyebrow')}
      title={t('changePassword.title')}
      subtitle={t('changePassword.subtitle')}
      onSubmit={submit}
      footer={
        <Button type="submit" variant="primary" loading={change.isLoading} disabled={!current || !next || !confirm}>
          {change.isLoading ? t('changePassword.saving') : t('changePassword.submit')}
        </Button>
      }
    >
      <FormSection title={t('changePassword.section')}>
        <Field label={t('changePassword.current')}>
          <Input id="current-password" type="password" autoComplete="current-password" required value={current} onChange={edit(setCurrent)} />
        </Field>
        <Field label={t('changePassword.new')} help={t('changePassword.hint', { n: PASSWORD_MIN_LENGTH })}>
          <Input id="new-password" type="password" autoComplete="new-password" required value={next} onChange={edit(setNext)} />
        </Field>
        <Field label={t('changePassword.confirm')}>
          <Input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={edit(setConfirm)} />
        </Field>
        {errorKey && <Banner tone="danger">{t(errorKey, { n: PASSWORD_MIN_LENGTH })}</Banner>}
        {done && (
          <div role="status">
            <Banner>{t('changePassword.success')}</Banner>
          </div>
        )}
      </FormSection>
    </FormShell>
  )
}
