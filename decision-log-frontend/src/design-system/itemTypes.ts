import type { ItemType, SourceType } from '../types/projectItem'
import { Icons, type LucideIcon } from './icons'

/** Type is never conveyed by colour: icon + label only. */
export const ITEM_TYPE_ICONS: Record<ItemType, LucideIcon> = {
  decision: Icons.decision,
  action_item: Icons.actionOpen,
  topic: Icons.topic,
  idea: Icons.idea,
  information: Icons.information,
}

/** Canonical order: Decisão · Ação · Tópico · Ideia · Informação */
export const ITEM_TYPE_ORDER: ItemType[] = ['decision', 'action_item', 'topic', 'idea', 'information']

export const itemTypeLabelKey = (type: ItemType) => `labels:itemType.${type}` as const

export const SOURCE_ICONS: Record<SourceType, LucideIcon> = {
  meeting: Icons.meeting,
  email: Icons.email,
  document: Icons.document,
  manual_input: Icons.manual,
}

/** Reunião · E-mail · Documento · Entrada manual */
export const SOURCE_ORDER: SourceType[] = ['meeting', 'email', 'document', 'manual_input']

export const sourceLabelKey = (type: SourceType) => `labels:sourceType.${type}` as const
