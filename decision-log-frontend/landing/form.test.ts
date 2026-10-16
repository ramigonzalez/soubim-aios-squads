import { describe, expect, it } from 'vitest'
import { MESSAGES, buildPayload, leadsUrl, maskWhatsapp, modeFromSearch, outcomeFor, validateAll, validateField, type LeadValues } from './form'

const valid: LeadValues = {
  name: ' Ana ',
  company: 'Escritório Exemplo',
  whatsapp: '(11) 9 1234-5678',
  email: ' Ana@Escritorio.com.br ',
  role: 'partner',
  team_size: '10-24',
  website: '',
}

describe('maskWhatsapp', () => {
  it.each([
    ['', ''],
    ['1', '(1'],
    ['11', '(11'],
    ['119', '(11) 9'],
    ['1191234', '(11) 9 1234'],
    ['11912345678', '(11) 9 1234-5678'],
    ['(11) 9 1234-56789999', '(11) 9 1234-5678'],
    ['abc11x9', '(11) 9'],
  ])('%s → %s', (input, expected) => {
    expect(maskWhatsapp(input)).toBe(expected)
  })
})

describe('validateField', () => {
  it('requires every field, in pt-BR', () => {
    expect(validateField('name', '  ')).toBe('Informe seu nome.')
    expect(validateField('role', '')).toBe('Selecione seu cargo.')
  })
  it('checks the e-mail and the 11-digit WhatsApp', () => {
    expect(validateField('email', 'ana@')).toBe('Informe um e-mail válido.')
    expect(validateField('email', 'ana@x.com')).toBeNull()
    expect(validateField('whatsapp', '(11) 9 1234')).toBe(MESSAGES.invalid.whatsapp)
    expect(validateField('whatsapp', '(11) 9 1234-5678')).toBeNull()
  })
  it('accepts only the contract values for the selects', () => {
    expect(validateField('team_size', '50+')).toBeNull()
    expect(validateField('team_size', '100')).toBe(MESSAGES.invalid.team_size)
    expect(validateField('role', 'ceo')).toBe(MESSAGES.invalid.role)
  })
  it('validateAll returns only the failing fields', () => {
    expect(validateAll(valid)).toEqual({})
    expect(Object.keys(validateAll({ ...valid, email: '', company: '' }))).toEqual(['company', 'email'])
  })
})

describe('buildPayload', () => {
  it('trims, lowercases the e-mail, sends the WhatsApp digits and keeps the honeypot', () => {
    expect(buildPayload(valid, 'pilot')).toEqual({
      mode: 'pilot',
      name: 'Ana',
      company: 'Escritório Exemplo',
      whatsapp: '11912345678',
      email: 'ana@escritorio.com.br',
      role: 'partner',
      team_size: '10-24',
      website: '',
    })
  })
})

describe('outcomeFor', () => {
  it('201 is success', () => {
    expect(outcomeFor(201, { id: 1 })).toEqual({ kind: 'success' })
  })
  it('422 maps FastAPI locations to pt-BR field messages', () => {
    const body = { detail: [{ loc: ['body', 'email'], msg: 'value is not a valid email address' }, { loc: ['body', 'team_size'], msg: 'Input should be...' }] }
    expect(outcomeFor(422, body)).toEqual({ kind: 'invalid', errors: { email: MESSAGES.invalid.email, team_size: MESSAGES.invalid.team_size } })
  })
  it('422 without a known field falls back to the generic message', () => {
    expect(outcomeFor(422, { detail: [{ loc: ['body', 'website'], msg: 'x' }] })).toEqual({ kind: 'error', message: MESSAGES.generic })
    expect(outcomeFor(422, null)).toEqual({ kind: 'error', message: MESSAGES.generic })
  })
  it('429 and other statuses', () => {
    expect(outcomeFor(429, null)).toEqual({ kind: 'error', message: 'Muitas tentativas. Aguarde um minuto e tente de novo.' })
    expect(outcomeFor(500, null)).toEqual({ kind: 'error', message: 'Não foi possível enviar agora. Tente de novo ou fale conosco pelo WhatsApp.' })
  })
})

describe('helpers', () => {
  it('modeFromSearch reads ?modo=', () => {
    expect(modeFromSearch('?modo=piloto')).toBe('pilot')
    expect(modeFromSearch('?modo=demo')).toBe('demo')
    expect(modeFromSearch('')).toBeNull()
  })
  it('leadsUrl joins the base URL', () => {
    expect(leadsUrl(undefined)).toBe('/api/leads')
    expect(leadsUrl('https://api.promem.com.br/api/')).toBe('https://api.promem.com.br/api/leads')
  })
})
