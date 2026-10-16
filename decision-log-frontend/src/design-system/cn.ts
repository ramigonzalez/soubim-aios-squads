import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge only knows Tailwind's default scale. Without these groups it
 * would treat `text-small` (a size) and `text-ink-2` (a colour) as the same
 * utility and drop one of them.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{
        text: [
          'display', 'h1', 'h2', 'h3', 'body', 'small', 'caption', 'micro', 'label',
          'reading', 'reading-lg', 'mono', 'mono-sm', 'kpi', 'hero', 'section', 'section-sm',
        ],
      }],
      shadow: [{ shadow: ['xs', '1', '2', 'rail', 'tab-active', 'focus'] }],
    },
  },
})

/** Merge class names with Promem-aware precedence. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
