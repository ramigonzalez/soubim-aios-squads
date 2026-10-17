/**
 * Short stage line for a project ("Anteprojeto · 2 de 4"), used by the
 * project switcher, the mobile top bar and project rows.
 */
import i18n from '../i18n'
import { formatDay, formatDaysLeft } from './format'
import { layoutStages, type StageInput } from './stages'

export interface ProjectStageSummary {
  /** "Anteprojeto · 2 de 4", "Começa em 15/01", "Etapas concluídas" or "Sem etapas definidas" */
  label: string
  /** "faltam 28 dias" for the current stage */
  daysLeft: string | null
  currentName: string | null
}

export function summarizeStages(stages: StageInput[] | undefined, today: Date = new Date()): ProjectStageSummary {
  const { segments, currentIndex } = layoutStages(stages ?? [], today)
  if (segments.length === 0) return { label: i18n.t('nav:switcher.noStages'), daysLeft: null, currentName: null }
  if (currentIndex >= 0) {
    const current = segments[currentIndex]
    return {
      label: i18n.t('nav:switcher.stageOf', { stage: current.name, index: currentIndex + 1, total: segments.length }),
      daysLeft: current.daysLeft != null ? formatDaysLeft(current.daysLeft) : null,
      currentName: current.name,
    }
  }
  if (segments[0].status === 'future') {
    return { label: i18n.t('nav:switcher.notStarted', { date: formatDay(segments[0].start) }), daysLeft: null, currentName: null }
  }
  return { label: i18n.t('nav:switcher.finished'), daysLeft: null, currentName: null }
}
