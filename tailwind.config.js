/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          dark: '#1e1e2e',
          darker: '#11111b',
          card: '#2b2d31',
          cardHover: '#36373d',
          nav: '#1a1a2e',
          accent: '#5865F2',
          purple: '#8b5cf6',
          green: '#00ff88',
          red: '#ed4245',
        },
        cyber: {
          neon: '#00ff88',
          glow: '#00ff8840',
        },
      },
      spacing: {
        'ui-xs': '0.25rem',
        'ui-sm': '0.5rem',
        'ui-md': '0.75rem',
        'ui-lg': '1rem',
      },
      borderRadius: {
        'ui-sm': '0.5rem',
        'ui-md': '0.75rem',
        'ui-lg': '1rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['9px', { lineHeight: '1.2' }],
        'xs-compact': ['10px', { lineHeight: '1.3' }],
        'sm-compact': ['11px', { lineHeight: '1.35' }],
      },
      boxShadow: {
        'glow-xs': '0 0 6px rgba(0, 255, 136, 0.3)',
        glow: '0 0 20px rgba(0, 255, 136, 0.3)',
        'glow-sm': '0 0 10px rgba(0, 255, 136, 0.2)',
        'glow-md': '0 0 20px rgba(0, 255, 136, 0.3)',
        'glow-lg': '0 0 30px rgba(0, 255, 136, 0.5)',
        'glow-xl': '0 0 40px rgba(0, 255, 136, 0.3)',
        'glow-accent': '0 0 20px rgba(88, 101, 242, 0.2)',
        nav: '0 10px 25px rgba(0, 0, 0, 0.22)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 255, 136, 0.5)' },
        },
      },
    },
  },
  plugins: [],
}
