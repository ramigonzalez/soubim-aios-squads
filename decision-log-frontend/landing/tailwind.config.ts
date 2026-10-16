import type { Config } from 'tailwindcss'
import appConfig from '../tailwind.config'

/**
 * The app's Tailwind config (Promem preset, breakpoints, forms plugin) with the
 * landing's own content: the page and the design-system components it renders.
 */
const config: Config = {
  ...appConfig,
  content: {
    relative: true,
    files: ['./index.html', './**/*.{ts,tsx}', '../src/design-system/**/*.{ts,tsx}'],
  },
}

export default config
