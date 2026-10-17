/**
 * Build-time entry (loaded by the prerender plugin in vite.config.ts through Vite's SSR loader).
 * The design-system components read their labels (pt-BR) from the app's i18n setup.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import '../src/i18n'
import { Landing } from './Landing'

export function render(): string {
  return renderToStaticMarkup(<Landing />)
}
