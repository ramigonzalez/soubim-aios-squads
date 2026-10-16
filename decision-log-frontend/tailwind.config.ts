import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'
import promemPreset from './src/design-system/tailwind.preset'

// Promem design system (docs/design_handoff_promem): every colour, type size,
// radius and shadow comes from the preset, which points at src/design-system/tokens.css.
const config: Config = {
  presets: [promemPreset as Config],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Create / edit forms: single column, max 760 (UX-UI-GUIDELINES §5)
      maxWidth: { form: '760px' },
      screens: {
        'sm': '375px',   // Mobile
        'md': '768px',   // Tablet
        'lg': '1024px',  // Desktop
        'xl': '1280px',  // Large desktop
        '2xl': '1536px', // Extra large
      },
    },
  },
  plugins: [forms],
}

export default config
