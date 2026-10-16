/**
 * The fixed discipline list (UX-UI-GUIDELINES §8). One row per discipline:
 * backend key ↔ 3-letter code ↔ colour token ↔ i18n name.
 * Class names are literal so Tailwind can see them.
 */
import type { Discipline } from '../types/projectItem'

export interface DisciplineMeta {
  key: Discipline
  /** 3-letter code shown in rows (never translated) */
  code: string
  /** Tailwind background class for the marker square */
  markerClass: string
}

export const DISCIPLINES: Record<Discipline, DisciplineMeta> = {
  architecture: { key: 'architecture', code: 'ARQ', markerClass: 'bg-disc-arq' },
  structural: { key: 'structural', code: 'EST', markerClass: 'bg-disc-est' },
  mep: { key: 'mep', code: 'INS', markerClass: 'bg-disc-ins' },
  electrical: { key: 'electrical', code: 'ELE', markerClass: 'bg-disc-ele' },
  plumbing: { key: 'plumbing', code: 'HID', markerClass: 'bg-disc-hid' },
  landscape: { key: 'landscape', code: 'PAI', markerClass: 'bg-disc-pai' },
  fire_protection: { key: 'fire_protection', code: 'INC', markerClass: 'bg-disc-inc' },
  acoustical: { key: 'acoustical', code: 'ACU', markerClass: 'bg-disc-acu' },
  sustainability: { key: 'sustainability', code: 'SUS', markerClass: 'bg-disc-sus' },
  civil: { key: 'civil', code: 'CIV', markerClass: 'bg-disc-civ' },
  client: { key: 'client', code: 'CLI', markerClass: 'bg-disc-cli' },
  contractor: { key: 'contractor', code: 'CON', markerClass: 'bg-disc-con' },
  tenant: { key: 'tenant', code: 'LOC', markerClass: 'bg-disc-loc' },
  engineer: { key: 'engineer', code: 'ENG', markerClass: 'bg-disc-eng' },
  general: { key: 'general', code: 'GER', markerClass: 'bg-disc-ger' },
}

/** Canonical display order (guidelines §8). */
export const DISCIPLINE_ORDER = Object.keys(DISCIPLINES) as Discipline[]

/** Unknown values from the API fall back to "general", as the backend does. */
export function disciplineMeta(key: string): DisciplineMeta {
  return DISCIPLINES[key as Discipline] ?? DISCIPLINES.general
}

/** i18n key for the full name ("Prevenção de incêndio"). */
export const disciplineNameKey = (key: Discipline) => `labels:discipline.${key}` as const
/** i18n key for the explicit short name ("Incêndio"), for chips on mobile (README §7.5). */
export const disciplineShortKey = (key: Discipline) => `labels:disciplineShort.${key}` as const
