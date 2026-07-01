/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Obsidian Studio Theme
        // v2.9.0: Alle Farben nutzen CSS-Variablen mit Fallback-Werten.
        // AppContext.applyUserTheme() setzt die Variablen auf :root – Tailwind-Klassen
        // reagieren dadurch auf Laufzeit-Themenänderungen (Persönliches Design).
        obsidian: {
          950: 'var(--color-obsidian-950, #0a0a0f)',
          900: 'var(--color-obsidian-900, #0f0f1a)',
          800: 'var(--color-obsidian-800, #141420)',
          700: 'var(--color-obsidian-700, #1a1a2e)',
          600: 'var(--color-obsidian-600, #1e1e35)',
          500: 'var(--color-obsidian-500, #252540)',
        },
        accent: {
          purple:       'var(--color-accent-primary, #7c3aed)',
          'purple-light': 'var(--color-accent-primary-light, #8b5cf6)',
          'purple-dark':  'var(--color-accent-primary-dark, #6d28d9)',
          blue:         'var(--color-accent-blue, #2563eb)',
          'blue-light': 'var(--color-accent-blue-light, #3b82f6)',
          cyan:         'var(--color-accent-cyan, #06b6d4)',
          green:        'var(--color-accent-green, #10b981)',
          orange:       'var(--color-accent-orange, #f59e0b)',
          red:          'var(--color-accent-red, #ef4444)',
          yellow:       'var(--color-accent-yellow, #eab308)',
          amber:        'var(--color-accent-amber, #f59e0b)',
        },
        surface: {
          DEFAULT:       'var(--color-surface, #1a1a2e)',
          raised:        'var(--color-surface-raised, #1e1e35)',
          overlay:       'var(--color-surface-overlay, #252540)',
          border:        'var(--color-surface-border, #2d2d4e)',
          'border-light': 'var(--color-surface-border-light, #3d3d6e)',
        },
        text: {
          primary:   'var(--color-text-primary, #f1f5f9)',
          secondary: 'var(--color-text-secondary, #94a3b8)',
          muted:     'var(--color-text-muted, #64748b)',
          accent:    'var(--color-text-accent, #a78bfa)',
        },
        sidebar: {
          bg:     'var(--color-sidebar-bg, #141420)',
          border: 'var(--color-sidebar-border, #2d2d4e)',
        },
      },
      fontFamily: {
        sans: ['var(--font-family, Inter)', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'xs':   ['0.75rem',   { lineHeight: '1rem' }],
        'sm':   ['0.875rem',  { lineHeight: '1.25rem' }],
        'base': ['1rem',      { lineHeight: '1.5rem' }],
        'lg':   ['1.125rem',  { lineHeight: '1.75rem' }],
        'xl':   ['1.25rem',   { lineHeight: '1.75rem' }],
        '2xl':  ['1.5rem',    { lineHeight: '2rem' }],
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(124, 58, 237, 0.3)',
        'glow-blue':   '0 0 20px rgba(37, 99, 235, 0.3)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-in-out',
        'slide-in':   'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
