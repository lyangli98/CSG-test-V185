/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        // Premium shadows: large blur, very low opacity
        'premium-sm': '0 8px 24px rgba(15,23,42,0.04)',
        'premium': '0 16px 40px rgba(15,23,42,0.06)',
        'premium-lg': '0 24px 60px rgba(15,23,42,0.07)',
        'premium-blue': '0 16px 40px rgba(8,145,178,0.06)',
        'premium-emerald': '0 16px 40px rgba(16,185,129,0.06)',
        'premium-amber': '0 16px 40px rgba(245,158,11,0.06)',
        'premium-inset': 'inset 0 1px 2px rgba(255,255,255,0.9)',
      },
    },
  },
  plugins: [],
};
