/**
 * Escritório settings (Promem revamp G7): how the firm appears to clients on public milestone
 * links — tagline, contact e-mail and logo. Owners and admins of the active organization.
 * Settings pattern from the cookbook (form shell, section cards).
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Banner, Button, ErrorState, Field, Input, SkeletonRows, useToast } from '../design-system'
import { FormSection, FormShell } from '../components/templates/FormShell'
import { FormContainer } from '../components/templates/PageContainer'
import { useActiveOrganization } from '../hooks/useOrganizations'
import api from '../services/api'
import type { Branding } from '../types/project'

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
const LOGO_MAX_BYTES = 300 * 1024

export default function WorkspaceSettings() {
  const { t } = useTranslation('project')
  const toast = useToast()
  const queryClient = useQueryClient()
  const { active, isAdmin, isLoading: orgsLoading } = useActiveOrganization()
  const orgId = active?.id
  const branding = useQuery<Branding, Error>(['branding', orgId], async () => (await api.get<Branding>(`/organizations/${orgId}/branding`)).data, {
    enabled: !!orgId && isAdmin,
  })
  const [tagline, setTagline] = useState('')
  const [contact, setContact] = useState('')
  const [logo, setLogo] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!branding.data) return
    setTagline(branding.data.tagline ?? '')
    setContact(branding.data.contact_email ?? '')
    setLogo(branding.data.logo)
  }, [branding.data])

  const save = useMutation(
    () => api.put<Branding>(`/organizations/${orgId}/branding`, { tagline: tagline.trim() || null, contact_email: contact.trim() || null, logo }),
    {
      onSuccess: () => {
        toast.show({ message: t('workspace.saved'), tone: 'success' })
        void queryClient.invalidateQueries(['branding', orgId])
        void queryClient.invalidateQueries('project')
      },
    },
  )

  const pick = (chosen: File | undefined) => {
    setLogoError(null)
    if (!chosen) return
    if (!LOGO_TYPES.includes(chosen.type)) return setLogoError(t('workspace.logoType'))
    if (chosen.size > LOGO_MAX_BYTES) return setLogoError(t('workspace.logoTooBig'))
    const reader = new FileReader()
    reader.onload = () => setLogo(String(reader.result))
    reader.readAsDataURL(chosen)
  }

  if (!orgsLoading && !isAdmin) {
    return (
      <FormContainer>
        <Banner>{t('workspace.noAccess')}</Banner>
      </FormContainer>
    )
  }
  if (orgsLoading || branding.isLoading) {
    return (
      <FormContainer>
        <SkeletonRows rows={5} rowClassName="h-12" />
      </FormContainer>
    )
  }
  if (branding.isError) return <ErrorState title={t('workspace.error')} onRetry={() => void branding.refetch()} />

  return (
    <FormShell
      eyebrow={t('workspace.eyebrow')}
      title={t('workspace.title')}
      subtitle={t('workspace.description')}
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        save.mutate()
      }}
      footer={
        <>
          {save.isError && <p className="mr-auto text-caption text-danger-ink">{t('workspace.error')}</p>}
          <Button type="submit" variant="primary" loading={save.isLoading}>
            {t('workspace.save')}
          </Button>
        </>
      }
    >
      <FormSection title={t('workspace.brand')}>
        <Field label={t('workspace.name')} help={t('workspace.nameHelp')}>
          <Input value={branding.data?.name ?? active?.name ?? ''} readOnly disabled />
        </Field>
        <Field label={t('workspace.tagline')} optional>
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder={t('workspace.taglinePlaceholder')} maxLength={255} />
        </Field>
        <Field label={t('workspace.contact')} optional help={t('workspace.contactHelp')}>
          <Input type="email" value={contact} onChange={(e) => setContact(e.target.value)} />
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-small font-semibold text-ink">{t('workspace.logo')}</span>
          <div className="flex flex-wrap items-center gap-4">
            {logo ? (
              <img src={logo} alt={t('workspace.logo')} className="h-14 w-14 rounded-md border border-line object-contain" />
            ) : (
              <span aria-hidden className="h-14 w-14 rounded-md border border-dashed border-line-strong" />
            )}
            <Button size="sm" onClick={() => file.current?.click()}>
              {t('workspace.chooseLogo')}
            </Button>
            {logo && (
              <Button size="sm" variant="danger-ghost" onClick={() => setLogo(null)}>
                {t('workspace.removeLogo')}
              </Button>
            )}
            <input ref={file} type="file" accept={LOGO_TYPES.join(',')} className="hidden" data-testid="logo-input" onChange={(e) => pick(e.target.files?.[0])} />
          </div>
          <p className={logoError ? 'text-caption text-danger-ink' : 'text-caption text-ink-2'}>{logoError ?? t('workspace.logoHelp')}</p>
        </div>
      </FormSection>
    </FormShell>
  )
}
