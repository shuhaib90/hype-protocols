/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#05010d',
          surface: '#0d0624',
          panel: '#08041c',
          card: '#0a041f',
          cardHover: '#130933',
          border: 'rgba(139, 92, 246, 0.35)',
          borderSubtle: 'rgba(255, 255, 255, 0.08)',
          blue: '#00f0ff',
          blueGlow: 'rgba(0, 240, 255, 0.3)',
          ocean: '#0099ff',
          purple: '#8b5cf6',
          purpleDim: 'rgba(139, 92, 246, 0.2)',
          mint: '#00ff88',
          mintGlow: 'rgba(0, 255, 136, 0.3)',
          amber: '#f59e0b',
          pink: '#f43f5e',
          red: '#ef4444',
          text: '#f1f5f9',
          dim: '#cbd5e1',
          muted: '#94a3b8',
        }
      },
      fontFamily: {
        mono: ['"VT323"', '"JetBrains Mono"', 'monospace'],
        display: ['"Press Start 2P"', '"Pixelify Sans"', 'sans-serif'],
        sans: ['"Pixelify Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'neon-blue': '0 0 20px rgba(0, 240, 255, 0.3)',
        'neon-mint': '0 0 20px rgba(0, 255, 136, 0.3)',
        'neon-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
        'neon-amber': '0 0 20px rgba(245, 158, 11, 0.3)',
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' }
        }
      }
    },
  },
  plugins: [],
};
