/**
 * Contact form (LANDING_COPY §9), server-rendered with native controls so it
 * works without a React runtime: the mode switch is two radios styled as the
 * SegmentedControl, the selects are native (better on phones). client.ts adds
 * the mask, validation and submission. Field markup mirrors the design-system
 * Field (label, control, danger-ink helper with the warning icon) with stable ids.
 */
import type { ReactNode } from 'react'
import { Button, Icons, Input, cn } from '../src/design-system'
import { ROLE_OPTIONS, TEAM_SIZE_OPTIONS, type FieldName, type LeadMode } from './form'
import { Placeholder } from './ui'

const fieldId = (field: FieldName) => `lead-${field}`

function FormField({ field, label, children }: { field: FieldName; label: string; children: ReactNode }) {
  const Warn = Icons.warning
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={fieldId(field)} className="text-small font-semibold text-ink">
        {label}
      </label>
      {children}
      <p id={`${fieldId(field)}-error`} hidden className="flex items-start gap-1.5 text-caption text-danger-ink">
        <Warn className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
        <span data-error-text="" />
      </p>
    </div>
  )
}

/** Field height 44 px everywhere (prototype; touch target on phones). Error border via aria-invalid. */
const CONTROL = 'h-11 aria-[invalid=true]:border-danger'

function TextField({ field, label, ...input }: { field: FieldName; label: string } & Parameters<typeof Input>[0]) {
  return (
    <FormField field={field} label={label}>
      <Input id={fieldId(field)} name={field} required aria-describedby={`${fieldId(field)}-error`} className={CONTROL} {...input} />
    </FormField>
  )
}

function SelectField({ field, label, options }: { field: FieldName; label: string; options: readonly { value: string; label: string }[] }) {
  return (
    <FormField field={field} label={label}>
      <select
        id={fieldId(field)}
        name={field}
        required
        defaultValue=""
        aria-describedby={`${fieldId(field)}-error`}
        className={cn(
          'w-full rounded-md border border-line-strong bg-surface px-3 text-body text-ink',
          'focus:border-accent focus:shadow-focus focus:outline-none focus:ring-0',
          CONTROL,
        )}
      >
        <option value="" disabled>
          Selecione…
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  )
}

const MODES: { value: LeadMode; label: string }[] = [
  { value: 'demo', label: 'Demonstração' },
  { value: 'pilot', label: 'Piloto gratuito' },
]

/** Native radios with the SegmentedControl look (surface-3 track, white checked segment). */
function ModeSwitch() {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="sr-only">O que você quer</legend>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-3 p-1">
        {MODES.map((mode) => (
          <label key={mode.value} className="relative flex">
            <input type="radio" name="mode" value={mode.value} defaultChecked={mode.value === 'demo'} className="peer sr-only" />
            <span
              className={cn(
                'flex min-h-touch w-full cursor-pointer items-center justify-center rounded-md px-2 text-center text-body font-semibold text-ink-2',
                'transition-colors duration-fast ease-promem hover:text-ink',
                'peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-xs peer-focus-visible:shadow-focus',
              )}
            >
              {mode.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function ContactForm() {
  const Check = Icons.check
  return (
    <div className="flex min-w-0 flex-col rounded-lg border border-line bg-surface p-5 sm:p-7">
      <form id="lead-form" method="post" className="lead-form flex flex-col gap-4" aria-label="Pedido de contato">
        <ModeSwitch />
        <div className="grid gap-3.5 md:grid-cols-2">
          <TextField field="name" label="Nome" placeholder="Seu nome" autoComplete="name" />
          <TextField field="company" label="Escritório ou empresa" placeholder="Nome do escritório" autoComplete="organization" />
          <TextField field="whatsapp" label="WhatsApp" type="tel" inputMode="numeric" placeholder="(11) 9 0000-0000" autoComplete="tel-national" maxLength={16} />
          <TextField field="email" label="E-mail" type="email" placeholder="voce@escritorio.com.br" autoComplete="email" />
          <SelectField field="role" label="Cargo" options={ROLE_OPTIONS} />
          <SelectField field="team_size" label="Tamanho da equipe" options={TEAM_SIZE_OPTIONS} />
        </div>
        {/* Honeypot: hidden from people and from assistive tech; bots fill it and the API discards the lead. */}
        <div aria-hidden="true" className="absolute -left-full h-px w-px overflow-hidden">
          <label htmlFor="lead-website">Website</label>
          <input id="lead-website" type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>
        <p id="lead-error" role="alert" hidden className="rounded-md bg-danger-weak px-3 py-2 text-small text-danger-ink" />
        <Button type="submit" variant="primary" size="lg" className="h-12 w-full text-h3">
          <span data-mode-label="demo">Agendar demonstração</span>
          <span data-mode-label="pilot">Solicitar piloto gratuito</span>
        </Button>
        <p className="text-caption text-ink-2">
          Usamos seus dados só para entrar em contato sobre o Promem. <Placeholder className="py-0">[Link para a política de privacidade]</Placeholder>
        </p>
      </form>
      <div id="lead-success" hidden tabIndex={-1} className="flex flex-col items-center gap-3 py-6 text-center outline-none">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-weak text-success">
          <Check className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </span>
        <h3 className="text-h2 text-ink">Recebemos seu pedido</h3>
        <p className="max-w-sm text-pretty text-body text-ink-2">Vamos falar com você em até 1 dia útil pelo WhatsApp ou e-mail informado.</p>
        <Placeholder>[Confirmar prazo de resposta]</Placeholder>
      </div>
    </div>
  )
}
