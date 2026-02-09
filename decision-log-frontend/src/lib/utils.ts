import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combine Tailwind CSS classes with proper precedence
 * Used throughout the app for dynamic className composition
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
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
 * Get discipline color class
 * Maps discipline to Tailwind color from design system
 */
export function getDisciplineColor(discipline: string): {
  bg: string
  text: string
  border: string
} {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    'architecture': { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300' },
    'mep': { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-300' },
    'landscape': { bg: 'bg-green-100', text: 'text-green-900', border: 'border-green-300' },
    'structural': { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300' },
    'electrical': { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300' },
    'plumbing': { bg: 'bg-cyan-100', text: 'text-cyan-900', border: 'border-cyan-300' },
  }
  return colorMap[discipline.toLowerCase()] || colorMap['architecture']
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
    mep: 'MEP',
    structural: 'Struct',
    electrical: 'Elec',
    plumbing: 'Plumb',
    landscape: 'Land',
    general: 'Gen',
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
    mep: { bg: 'bg-orange-100', text: 'text-orange-700' },
    landscape: { bg: 'bg-green-100', text: 'text-green-700' },
    structural: { bg: 'bg-purple-100', text: 'text-purple-700' },
    electrical: { bg: 'bg-amber-100', text: 'text-amber-700' },
    plumbing: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  }
  return colorMap[discipline.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-700' }
}

/**
 * Get discipline left-border color for MeetingGroup accent (Story 3.13)
 */
export function getDisciplineBorderColor(discipline: string): string {
  const colorMap: Record<string, string> = {
    architecture: 'border-l-blue-400',
    mep: 'border-l-orange-400',
    structural: 'border-l-purple-400',
    electrical: 'border-l-amber-400',
    plumbing: 'border-l-cyan-400',
    landscape: 'border-l-green-400',
  }
  return colorMap[discipline.toLowerCase()] || 'border-l-gray-300'
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
