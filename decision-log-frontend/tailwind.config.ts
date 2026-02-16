import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // DecisionLog Discipline Colors
        discipline: {
          architecture: '#3B82F6',  // Blue
          mep: '#F97316',           // Orange
          landscape: '#10B981',     // Green
          structural: '#8B5CF6',    // Purple
          electrical: '#F59E0B',    // Amber
          plumbing: '#06B6D4',      // Cyan
        },
        // Consensus Colors
        consensus: {
          agree: '#10B981',         // Green
          mixed: '#F59E0B',         // Amber
          dissent: '#EF4444',       // Red
        },
        // Impact Severity Colors
        impact: {
          high: '#DC2626',          // Red 600
          medium: '#F59E0B',        // Amber 500
          low: '#9CA3AF',           // Gray 400
        },
      },
      screens: {
        'sm': '375px',   // Mobile
        'md': '768px',   // Tablet
        'lg': '1024px',  // Desktop
        'xl': '1280px',  // Large desktop
        '2xl': '1536px', // Extra large
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}

export default config
