/// <reference types="vite/client" />
/**
 * i18n setup (Story 11.1): interface labels in Brazilian Portuguese by default,
 * English as fallback. Code, identifiers and API values stay in English.
 *
 * Translations live in locales/<language>/<namespace>.json — one namespace per
 * area of the app, plus `common` (shared words) and `labels` (disciplines, item
 * and source types). Every key must exist in both languages.
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export const DEFAULT_LANGUAGE = 'pt-BR'
export const SUPPORTED_LANGUAGES = ['pt-BR', 'en'] as const

type Namespace = Record<string, unknown>

function load(modules: Record<string, Namespace>): Record<string, Namespace> {
  const resources: Record<string, Namespace> = {}
  for (const [path, content] of Object.entries(modules)) {
    const ns = path.split('/').pop()!.replace('.json', '')
    resources[ns] = content
  }
  return resources
}

const ptBR = load(import.meta.glob<Namespace>('./locales/pt-BR/*.json', { eager: true, import: 'default' }))
const en = load(import.meta.glob<Namespace>('./locales/en/*.json', { eager: true, import: 'default' }))

void i18n.use(initReactI18next).init({
  resources: { 'pt-BR': ptBR, en },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: 'en',
  ns: Object.keys(ptBR),
  defaultNS: 'common',
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
})

/**
 * BCP 47 locale for dates and numbers in the current language.
 */
export function dateLocale(): string {
  return i18n.language === 'en' ? 'en-US' : 'pt-BR'
}

export default i18n
