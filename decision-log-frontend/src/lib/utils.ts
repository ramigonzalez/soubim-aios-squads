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
