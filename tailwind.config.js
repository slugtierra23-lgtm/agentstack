/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        black: '#060608',
        white: '#f0ece3',
        acid: '#c8ff00',
        orange: '#ff5f1f',
        dim: '#1a1a22',
        muted: '#5a5a72',
        border: 'rgba(200,255,0,0.15)',
      },
      fontFamily: {
        display: ['var(--font-bebas)', 'sans-serif'],
        body:    ['var(--font-syne)', 'sans-serif'],
        mono:    ['var(--font-share-tech)', 'var(--font-syne-mono)', 'monospace'],
      },
      animation: {
        'ticker':      'ticker 25s linear infinite',
        'pulse-slow':  'pulse 3s ease-in-out infinite',
        'orb':         'orb 5s ease-in-out infinite',
        'blink':       'blink 1.4s ease-in-out infinite',
        'fade-up':     'fadeUp 0.6s ease forwards',
        'scan':        'scan 2s linear infinite',
      },
      keyframes: {
        ticker: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        orb: {
          '0%,100%': { transform: 'scale(1)', opacity: '0.7' },
          '50%':     { transform: 'scale(1.1)', opacity: '1' },
        },
        blink:  { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
        fadeUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scan:   { from: { transform: 'translateY(-100%)' }, to: { transform: 'translateY(100%)' } },
      },
    },
  },
  plugins: [],
};
