/**
 * The landing's only script (README §10: no client JS except the form, FAQ and mode switch).
 * The FAQ is native <details>; the mode switch is native radios. This file adds:
 * - CTAs with `data-mode` preselect the form mode (they stay plain #contato anchors);
 * - `?modo=piloto` in a shared link preselects the pilot;
 * - WhatsApp mask, validation on blur then on submit, JSON submission and the success state.
 */
import {
  FIELD_ORDER,
  MESSAGES,
  buildPayload,
  leadsUrl,
  modeFromSearch,
  outcomeFor,
  maskWhatsapp,
  validateAll,
  validateField,
  type FieldErrors,
  type FieldName,
  type LeadMode,
  type LeadValues,
} from './form'

type Control = HTMLInputElement | HTMLSelectElement

const form = document.querySelector<HTMLFormElement>('#lead-form')

function setMode(mode: LeadMode) {
  const radio = form?.querySelector<HTMLInputElement>(`input[name="mode"][value="${mode}"]`)
  if (radio) radio.checked = true
}

document.addEventListener('click', (event) => {
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[data-mode]')
  const mode = link?.dataset.mode
  if (mode === 'demo' || mode === 'pilot') setMode(mode)
})

const initialMode = modeFromSearch(window.location.search)
if (initialMode) setMode(initialMode)

if (form) {
  // Native validation stays as the no-JS fallback; with JS we show our own pt-BR messages.
  form.noValidate = true
  const control = (field: FieldName) => form.elements.namedItem(field) as Control
  const generalError = document.getElementById('lead-error')
  const success = document.getElementById('lead-success')
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  const touched = new Set<FieldName>()

  const showError = (field: FieldName, message: string | null) => {
    const input = control(field)
    const box = document.getElementById(`lead-${field}-error`)
    const text = box?.querySelector('[data-error-text]')
    if (message) input.setAttribute('aria-invalid', 'true')
    else input.removeAttribute('aria-invalid')
    if (box && text) {
      text.textContent = message ?? ''
      box.hidden = !message
    }
  }

  const showErrors = (errors: FieldErrors) => {
    for (const field of FIELD_ORDER) showError(field, errors[field] ?? null)
    const first = FIELD_ORDER.find((field) => errors[field])
    if (first) control(first).focus()
  }

  const showGeneral = (message: string | null) => {
    if (!generalError) return
    generalError.textContent = message ?? ''
    generalError.hidden = !message
  }

  const values = (): LeadValues => ({
    name: control('name').value,
    company: control('company').value,
    whatsapp: control('whatsapp').value,
    email: control('email').value,
    role: control('role').value,
    team_size: control('team_size').value,
    website: (form.elements.namedItem('website') as HTMLInputElement | null)?.value ?? '',
  })

  for (const field of FIELD_ORDER) {
    const input = control(field)
    input.addEventListener('blur', () => {
      touched.add(field)
      showError(field, validateField(field, input.value))
    })
    const recheck = () => {
      if (field === 'whatsapp') input.value = maskWhatsapp(input.value)
      // After the first blur, errors clear (or update) as the person types.
      if (touched.has(field)) showError(field, validateField(field, input.value))
    }
    input.addEventListener(input instanceof HTMLSelectElement ? 'change' : 'input', recheck)
  }

  let sending = false
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (sending) return
    showGeneral(null)
    const current = values()
    const errors = validateAll(current)
    FIELD_ORDER.forEach((field) => touched.add(field))
    if (Object.keys(errors).length > 0) {
      showErrors(errors)
      return
    }
    const mode = (form.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value ?? 'demo') as LeadMode
    sending = true
    submit?.setAttribute('aria-busy', 'true')
    if (submit) submit.disabled = true
    try {
      const response = await fetch(leadsUrl(import.meta.env.VITE_API_BASE_URL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(buildPayload(current, mode)),
      })
      const body: unknown = await response.json().catch(() => null)
      const outcome = outcomeFor(response.status, body)
      if (outcome.kind === 'success') {
        form.hidden = true
        if (success) {
          success.hidden = false
          success.focus()
        }
        return
      }
      if (outcome.kind === 'invalid') showErrors(outcome.errors)
      else showGeneral(outcome.message)
    } catch {
      showGeneral(MESSAGES.generic)
    } finally {
      sending = false
      submit?.removeAttribute('aria-busy')
      if (submit) submit.disabled = false
    }
  })
}
