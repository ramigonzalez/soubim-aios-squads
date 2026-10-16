// Promem — Tailwind CSS v3 preset.
// Usage: tailwind.config.ts → `presets: [promemPreset]` and import design-system/tokens.css once (e.g. in main.tsx).
// Every value points at a CSS variable from tokens.css: change tokens there, never here.
// If the codebase is on Tailwind v4, use tailwind-v4-theme.css instead of this file.
import type { Config } from 'tailwindcss';

const v = (name: string) => `var(--${name})`;

const DISCIPLINES = ['arq', 'est', 'ins', 'ele', 'hid', 'pai', 'inc', 'acu', 'sus', 'civ', 'cli', 'con', 'loc', 'eng', 'ger'] as const;

const promemPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: { DEFAULT: v('surface'), 2: v('surface-2'), 3: v('surface-3'), sunk: v('surface-sunk') },
        line: { DEFAULT: v('line'), soft: v('line-soft'), strong: v('line-strong') },
        track: v('track'),
        ink: { DEFAULT: v('ink'), soft: v('ink-soft'), 2: v('ink-2'), 3: v('ink-3'), 4: v('ink-4') },
        accent: { DEFAULT: v('accent'), strong: v('accent-strong'), weak: v('accent-weak'), 'on-dark': v('accent-on-dark') },
        success: { DEFAULT: v('success'), weak: v('success-weak'), 'on-dark': v('success-on-dark') },
        warning: { DEFAULT: v('warning'), ink: v('warning-ink'), weak: v('warning-weak'), line: v('warning-line') },
        danger: { DEFAULT: v('danger'), ink: v('danger-ink'), weak: v('danger-weak'), line: v('danger-line'), 'on-dark': v('danger-on-dark') },
        'on-dark': { DEFAULT: v('on-dark'), 2: v('on-dark-2'), 3: v('on-dark-3'), line: v('on-dark-line') },
        disc: Object.fromEntries(DISCIPLINES.map((d) => [d, v(`disc-${d}`)])),
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      // Type scale. Prototype sizes snap to these tokens per README §6.3 (no arbitrary px values).
      fontSize: {
        display: ['48px', { lineHeight: '1.05', letterSpacing: '-0.035em', fontWeight: '700' }],
        h1: ['28px', { lineHeight: '1.2', letterSpacing: '-0.025em', fontWeight: '600' }],
        h2: ['20px', { lineHeight: '1.3', letterSpacing: '-0.015em', fontWeight: '600' }],
        h3: ['15px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['14px', { lineHeight: '1.5' }],
        small: ['13px', { lineHeight: '1.45' }],
        caption: ['12px', { lineHeight: '1.4' }],
        micro: ['11px', { lineHeight: '1.35' }],   // sans, non-caps (sidebar workspace name, "by souBIM")
        label: ['11px', { lineHeight: '1.3', letterSpacing: '0.06em', fontWeight: '600' }], // always uppercase
        reading: ['17px', { lineHeight: '1.5' }],   // font-serif
        mono: ['12px', { lineHeight: '1.4' }],      // font-mono
        'mono-sm': ['11px', { lineHeight: '1.4' }], // font-mono
        kpi: ['26px', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '600' }],
        // Landing only
        hero: ['clamp(36px, 6vw, 56px)', { lineHeight: '1.05', letterSpacing: '-0.04em', fontWeight: '700' }],
        section: ['clamp(30px, 5vw, 44px)', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '700' }],
        'section-sm': ['clamp(28px, 4.6vw, 40px)', { lineHeight: '1.12', letterSpacing: '-0.03em', fontWeight: '700' }],
        'reading-lg': ['19px', { lineHeight: '1.55' }],
      },
      borderRadius: {
        xs: v('corner-xs'),
        sm: v('corner-sm'),
        DEFAULT: v('corner-md'),
        md: v('corner-md'),
        lg: v('corner-lg'),
      },
      boxShadow: {
        xs: v('elev-xs'),
        1: v('elev-1'),
        2: v('elev-2'),
        rail: v('rail-selected'),
        'tab-active': v('tab-active'),
        focus: v('focus-ring'),
      },
      width: { sidebar: v('sidebar-w'), panel: v('panel-w') },
      spacing: { sidebar: v('sidebar-w'), panel: v('panel-w') }, // for ml-sidebar, etc.
      maxWidth: { content: v('content-max'), landing: v('landing-max') },
      height: { row: v('row-h'), 'row-compact': v('row-h-compact'), 'row-2': v('row-h-two-line'), touch: v('touch-min') },
      minHeight: { row: v('row-h'), 'row-2': v('row-h-two-line'), touch: v('touch-min') },
      minWidth: { touch: v('touch-min') },
      // Named row layouts, so feature code never writes px grid templates (token guard)
      gridTemplateColumns: {
        'icon-line': '16px minmax(0,1fr)', // icon + wrapping text (approval candidates)
        'icon-row': '20px minmax(0,1fr) auto', // icon + two lines + trailing (panel lists)
        'tile-row': '32px minmax(0,1fr) auto', // 32 px tile + text + trailing
        excerpt: '56px minmax(0,1fr)', // mono time + transcript line
        preview: '62px minmax(0,1fr)', // speaker / time + preview line
        'meeting-item': '20px minmax(0,1fr) 56px', // extracted item + timestamp
        'stage-row': 'minmax(140px,1fr) minmax(0,140px) minmax(0,140px) 64px 32px', // stage editor
        'team-row': 'minmax(0,1fr) minmax(0,1.3fr) minmax(0,1.1fr) minmax(0,1fr) 32px', // team editor
      },
      padding: { 'safe-footer': 'calc(12px + env(safe-area-inset-bottom))' },
      transitionTimingFunction: { promem: v('ease') },
      transitionDuration: { fast: '120ms', base: '200ms' },
      screens: { xs: '375px' }, // Tailwind defaults cover md 768 / lg 1024 / xl 1280 / 2xl 1536
    },
  },
};

export default promemPreset;
