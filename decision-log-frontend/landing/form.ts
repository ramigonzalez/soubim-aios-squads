/**
 * Contact form logic, free of the DOM so it can be unit-tested (form.test.ts)
 * and shared by the server-rendered markup (options) and client.ts (behaviour).
 *
 * Contract: POST `${VITE_API_BASE_URL}/leads` with LeadPayload.
 * 201 → success · 422 → field errors (FastAPI `detail[].loc`) · 429 → rate limit · else → generic error.
 */

export type LeadMode = 'demo' | 'pilot'
export type FieldName = 'name' | 'company' | 'whatsapp' | 'email' | 'role' | 'team_size'
export type FieldErrors = Partial<Record<FieldName, string>>

export const FIELD_ORDER: FieldName[] = ['name', 'company', 'whatsapp', 'email', 'role', 'team_size']

export const ROLE_OPTIONS = [
  { value: 'partner', label: 'Sócio(a) ou diretor(a)' },
  { value: 'coordinator', label: 'Coordenador(a) de projetos' },
  { value: 'architect', label: 'Arquiteto(a) ou engenheiro(a)' },
  { value: 'other', label: 'Outro' },
] as const

export const TEAM_SIZE_OPTIONS = [
  { value: '1-9', label: '1 a 9 pessoas' },
  { value: '10-24', label: '10 a 24 pessoas' },
  { value: '25-50', label: '25 a 50 pessoas' },
  { value: '50+', label: 'Mais de 50' },
] as const

export interface LeadValues {
  name: string
  company: string
  whatsapp: string
  email: string
  role: string
  team_size: string
  /** Honeypot: hidden from people, must stay empty */
  website: string
}

export interface LeadPayload extends LeadValues {
  mode: LeadMode
}

export const MESSAGES = {
  required: {
    name: 'Informe seu nome.',
    company: 'Informe o nome do escritório ou da empresa.',
    whatsapp: 'Informe seu WhatsApp com DDD.',
    email: 'Informe seu e-mail.',
    role: 'Selecione seu cargo.',
    team_size: 'Selecione o tamanho da equipe.',
  },
  invalid: {
    name: 'Verifique o nome informado.',
    company: 'Verifique o nome do escritório ou da empresa.',
    whatsapp: 'Informe um WhatsApp válido, no formato (11) 9 0000-0000.',
    email: 'Informe um e-mail válido.',
    role: 'Selecione seu cargo.',
    team_size: 'Selecione o tamanho da equipe.',
  },
  rateLimited: 'Muitas tentativas. Aguarde um minuto e tente de novo.',
  generic: 'Não foi possível enviar agora. Tente de novo ou fale conosco pelo WhatsApp.',
} satisfies {
  required: Record<FieldName, string>
  invalid: Record<FieldName, string>
  rateLimited: string
  generic: string
}

const digits = (value: string) => value.replace(/\D/g, '')

/** Progressive mask `(00) 0 0000-0000` (11 digits: DDD + mobile number). */
export function maskWhatsapp(value: string): string {
  const d = digits(value).slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  let out = `(${d.slice(0, 2)}) ${d.slice(2, 3)}`
  if (d.length > 3) out += ` ${d.slice(3, 7)}`
  if (d.length > 7) out += `-${d.slice(7)}`
  return out
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isOption = (options: readonly { value: string }[], value: string) => options.some((o) => o.value === value)

/** pt-BR error for one field, or null when it is valid. */
export function validateField(field: FieldName, raw: string): string | null {
  const value = raw.trim()
  if (!value) return MESSAGES.required[field]
  switch (field) {
    case 'whatsapp':
      return digits(value).length === 11 ? null : MESSAGES.invalid.whatsapp
    case 'email':
      return EMAIL.test(value) ? null : MESSAGES.invalid.email
    case 'role':
      return isOption(ROLE_OPTIONS, value) ? null : MESSAGES.invalid.role
    case 'team_size':
      return isOption(TEAM_SIZE_OPTIONS, value) ? null : MESSAGES.invalid.team_size
    default:
      return null
  }
}

export function validateAll(values: LeadValues): FieldErrors {
  const errors: FieldErrors = {}
  for (const field of FIELD_ORDER) {
    const message = validateField(field, values[field])
    if (message) errors[field] = message
  }
  return errors
}

/** Trimmed values; the WhatsApp number goes as its 11 digits ("11900000000"). */
export function buildPayload(values: LeadValues, mode: LeadMode): LeadPayload {
  return {
    mode,
    name: values.name.trim(),
    company: values.company.trim(),
    whatsapp: digits(values.whatsapp),
    email: values.email.trim().toLowerCase(),
    role: values.role,
    team_size: values.team_size,
    website: values.website,
  }
}

export type SubmitOutcome =
  | { kind: 'success' }
  | { kind: 'invalid'; errors: FieldErrors }
  | { kind: 'error'; message: string }

const isField = (value: unknown): value is FieldName => typeof value === 'string' && (FIELD_ORDER as string[]).includes(value)

/** Maps the API response to what the form shows. Server messages are never shown (they are English). */
export function outcomeFor(status: number, body: unknown): SubmitOutcome {
  if (status === 201) return { kind: 'success' }
  if (status === 429) return { kind: 'error', message: MESSAGES.rateLimited }
  if (status === 422) {
    const detail = (body as { detail?: unknown } | null)?.detail
    const errors: FieldErrors = {}
    if (Array.isArray(detail)) {
      for (const entry of detail) {
        const loc = (entry as { loc?: unknown })?.loc
        const field = Array.isArray(loc) ? loc[loc.length - 1] : undefined
        if (isField(field) && !errors[field]) errors[field] = MESSAGES.invalid[field]
      }
    }
    if (Object.keys(errors).length > 0) return { kind: 'invalid', errors }
  }
  return { kind: 'error', message: MESSAGES.generic }
}

/** `?modo=piloto` (or `pilot`) in a shared link preselects the pilot. */
export function modeFromSearch(search: string): LeadMode | null {
  const value = new URLSearchParams(search).get('modo')?.toLowerCase()
  if (value === 'piloto' || value === 'pilot') return 'pilot'
  if (value === 'demonstracao' || value === 'demonstração' || value === 'demo') return 'demo'
  return null
}

export function leadsUrl(base: string | undefined): string {
  return `${(base || '/api').replace(/\/+$/, '')}/leads`
}
