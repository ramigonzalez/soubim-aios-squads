import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { CheckCircle2, MessageCircle, Target, Lightbulb, Info, Video, Mail, FileText, PenLine, HelpCircle, FileQuestion } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ItemType, SourceType, Discipline } from '../types/projectItem'

/**
 * Combine Tailwind CSS classes with proper precedence
 * Used throughout the app for dynamic className composition
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date for display
 * Parses YYYY-MM-DD strings as local dates to avoid timezone shifts
 */
export function formatDate(date: string | Date): string {
  let d: Date
  if (typeof date === 'string') {
    // Parse YYYY-MM-DD as local date to avoid timezone shift
    const [year, month, day] = date.split('-').map(Number)
    d = new Date(year, month - 1, day)
  } else {
    d = date
  }
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}


/**
 * Get consensus color class
 */
export function getConsensusColor(consensus: string): {
  bg: string
  text: string
} {
  const colorMap: Record<string, { bg: string; text: string }> = {
    'agree': { bg: 'bg-green-100', text: 'text-green-900' },
    'mixed': { bg: 'bg-amber-100', text: 'text-amber-900' },
    'dissent': { bg: 'bg-red-100', text: 'text-red-900' },
  }
  return colorMap[consensus.toUpperCase()] || colorMap['mixed']
}

/**
 * Get impact severity color class
 */
export function getImpactColor(severity: 'high' | 'medium' | 'low'): string {
  const colorMap = {
    high: 'bg-red-100 text-red-900',
    medium: 'bg-amber-100 text-amber-900',
    low: 'bg-gray-100 text-gray-900',
  }
  return colorMap[severity]
}

/**
 * Get impact type color for visual coding in drilldown
 */
export function getImpactTypeColor(type: string): { dot: string; bg: string; text: string } {
  const colorMap: Record<string, { dot: string; bg: string; text: string }> = {
    scope: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
    cost: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
    schedule: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
    quality: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    risk: { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700' },
    resource: { dot: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700' },
  }
  return colorMap[type.toLowerCase()] || { dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-700' }
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number = 100): string {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

/**
 * Format large numbers (e.g., 1000 -> 1K)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

/**
 * Calculate percentage change color
 */
export function getPercentageColor(change: number): string {
  if (change > 0) return 'text-green-600'
  if (change < 0) return 'text-red-600'
  return 'text-gray-600'
}

/**
 * Format date as "Friday, 7 February 2026" (full human-readable)
 */
export function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Format timestamp as HH:MM:SS (meeting recording time)
 */
export function formatTimestamp(timestamp: string): string {
  if (/^\d{2}:\d{2}:\d{2}$/.test(timestamp)) return timestamp
  try {
    const date = new Date(timestamp)
    return date.toISOString().substring(11, 19)
  } catch {
    return timestamp
  }
}

/**
 * Abbreviate discipline name for compact display
 */
export function abbreviateDiscipline(discipline: string): string {
  const abbreviations: Record<string, string> = {
    architecture: 'Arch',
    architect: 'Arch',
    mep: 'MEP',
    structural: 'Struct',
    electrical: 'Elec',
    plumbing: 'Plumb',
    landscape: 'Land',
    general: 'Gen',
    fire_protection: 'Fire',
    acoustical: 'Acoust',
    tenant: 'Tenant',
    sustainability: 'Sustain',
    civil: 'Civil',
    engineer: 'Eng',
    client: 'Client',
    contractor: 'Contr',
  }
  return abbreviations[discipline.toLowerCase()] || discipline
}

/**
 * Get discipline node color for timeline (returns Tailwind bg class)
 */
export function getDisciplineNodeColor(discipline: string): string {
  const colorMap: Record<string, string> = {
    architecture: 'bg-[#3B82F6]',
    mep: 'bg-[#F97316]',
    landscape: 'bg-[#10B981]',
    structural: 'bg-[#8B5CF6]',
    electrical: 'bg-[#F59E0B]',
    plumbing: 'bg-[#06B6D4]',
  }
  return colorMap[discipline.toLowerCase()] || 'bg-gray-400'
}

/**
 * Get discipline pill colors for DecisionRow (bg + text)
 */
export function getDisciplinePillColors(discipline: string): { bg: string; text: string } {
  const colorMap: Record<string, { bg: string; text: string }> = {
    architecture: { bg: 'bg-blue-100', text: 'text-blue-700' },
    architect: { bg: 'bg-blue-100', text: 'text-blue-700' },
    mep: { bg: 'bg-orange-100', text: 'text-orange-700' },
    landscape: { bg: 'bg-green-100', text: 'text-green-700' },
    structural: { bg: 'bg-purple-100', text: 'text-purple-700' },
    electrical: { bg: 'bg-amber-100', text: 'text-amber-700' },
    plumbing: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
    engineer: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    client: { bg: 'bg-rose-100', text: 'text-rose-700' },
    contractor: { bg: 'bg-amber-200', text: 'text-amber-700' },
    civil: { bg: 'bg-teal-100', text: 'text-teal-700' },
    sustainability: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    fire_protection: { bg: 'bg-red-100', text: 'text-red-700' },
    acoustical: { bg: 'bg-violet-100', text: 'text-violet-700' },
    tenant: { bg: 'bg-pink-100', text: 'text-pink-700' },
  }
  return colorMap[discipline.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-700' }
}

/**
 * Meeting type color map for filter dots and chips (Story 3.15)
 */
export function getMeetingTypeColors(type: string): { bg: string; text: string; dot: string } {
  const colorMap: Record<string, { bg: string; text: string; dot: string }> = {
    'client meeting': { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400' },
    'coordination': { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-400' },
    'design review': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
    'internal review': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
    'internal': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  }
  return colorMap[type.toLowerCase()] || { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' }
}

// --- Item Type utilities (Story 9.1) ---

const ITEM_TYPE_CONFIG: Record<ItemType, { bg: string; text: string; icon: LucideIcon; label: string }> = {
  decision:    { bg: 'bg-green-100',  text: 'text-green-700',  icon: CheckCircle2,  label: 'Decision' },
  topic:       { bg: 'bg-amber-100',  text: 'text-amber-700',  icon: MessageCircle, label: 'Topic' },
  action_item: { bg: 'bg-blue-100',   text: 'text-blue-700',   icon: Target,        label: 'Action Item' },
  idea:        { bg: 'bg-purple-100', text: 'text-purple-700', icon: Lightbulb,     label: 'Idea' },
  information: { bg: 'bg-slate-100',  text: 'text-slate-700',  icon: Info,          label: 'Information' },
}

export function getItemTypeColors(type: ItemType): { bg: string; text: string } {
  return ITEM_TYPE_CONFIG[type] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
}

export function getItemTypeIcon(type: ItemType): LucideIcon {
  return ITEM_TYPE_CONFIG[type]?.icon ?? HelpCircle
}

export function getItemTypeLabel(type: ItemType): string {
  return ITEM_TYPE_CONFIG[type]?.label ?? type
}

// --- Source Type utilities (Story 9.1) ---

const SOURCE_TYPE_CONFIG: Record<SourceType, { bg: string; text: string; icon: LucideIcon; label: string }> = {
  meeting:      { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: Video,    label: 'Meeting' },
  email:        { bg: 'bg-sky-100',    text: 'text-sky-700',    icon: Mail,     label: 'Email' },
  document:     { bg: 'bg-orange-100', text: 'text-orange-700', icon: FileText, label: 'Document' },
  manual_input: { bg: 'bg-gray-100',   text: 'text-gray-700',   icon: PenLine,  label: 'Manual Input' },
}

export function getSourceTypeColors(type: SourceType): { bg: string; text: string } {
  return SOURCE_TYPE_CONFIG[type] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
}

export function getSourceTypeIcon(type: SourceType): LucideIcon {
  return SOURCE_TYPE_CONFIG[type]?.icon ?? FileQuestion
}

export function getSourceTypeLabel(type: SourceType): string {
  return SOURCE_TYPE_CONFIG[type]?.label ?? type
}

// --- Discipline Circle utilities (Story 9.1) ---

const DISCIPLINE_CIRCLE_COLORS: Record<Discipline, string> = {
  architecture: '#3B82F6',
  structural: '#8B5CF6',
  mep: '#F97316',
  electrical: '#F59E0B',
  plumbing: '#06B6D4',
  landscape: '#10B981',
  fire_protection: '#EF4444',
  acoustical: '#7C3AED',
  sustainability: '#059669',
  civil: '#14B8A6',
  client: '#F43F5E',
  contractor: '#D97706',
  tenant: '#EC4899',
  engineer: '#6366F1',
  general: '#6B7280',
}

const DISCIPLINE_INITIALS: Record<Discipline, string> = {
  architecture: 'A',
  structural: 'S',
  mep: 'M',
  electrical: 'E',
  plumbing: 'P',
  landscape: 'L',
  fire_protection: 'F',
  acoustical: 'Ac',
  sustainability: 'Su',
  civil: 'C',
  client: 'Cl',
  contractor: 'Co',
  tenant: 'T',
  engineer: 'En',
  general: 'G',
}

export function getDisciplineCircleColor(discipline: Discipline): string {
  return DISCIPLINE_CIRCLE_COLORS[discipline] ?? '#6B7280'
}

export function getDisciplineInitial(discipline: Discipline): string {
  return DISCIPLINE_INITIALS[discipline] ?? discipline.charAt(0).toUpperCase()
}

/**
 * Get discipline display label (human-readable).
 * Story 9.3 — Multi-Discipline Circles
 */
export function getDisciplineLabel(discipline: string): string {
  const labelMap: Record<string, string> = {
    architecture: 'Architecture',
    architect: 'Architecture',
    mep: 'MEP',
    landscape: 'Landscape',
    structural: 'Structural',
    electrical: 'Electrical',
    plumbing: 'Plumbing',
    engineer: 'Engineer',
    client: 'Client',
    contractor: 'Contractor',
    civil: 'Civil',
    sustainability: 'Sustainability',
    fire_protection: 'Fire Protection',
    acoustical: 'Acoustical',
    tenant: 'Tenant',
    general: 'General',
  }
  return labelMap[discipline.toLowerCase()] || discipline.charAt(0).toUpperCase() + discipline.slice(1)
}

/**
 * Format file size in human-readable form.
 * Story 7.2 — Ingestion Approval Page
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Story 9.2 — Dense Rows Date Header format
 */
export function formatDenseDate(dateStr: string): string {
  let date: Date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number)
    date = new Date(year, month - 1, day)
  } else {
    date = new Date(dateStr)
  }
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const day = date.getDate()
  const year = date.getFullYear()
  return `${month} ${day}, ${year}`
}

