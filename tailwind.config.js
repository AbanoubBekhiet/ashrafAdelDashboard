/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Defining hex values directly to enable Tailwind's shorthand opacity (e.g., bg-primary/50)
        primary: "#4a7c59",
        "on-primary": "#ffffff",
        "primary-container": "#78a886",
        "on-primary-container": "#d8f0de",
        
        secondary: "#6b6358",
        "on-secondary": "#ffffff",
        "secondary-container": "#f0e8db",
        
        tertiary: "#705c30",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#c4a66a",
        
        background: "#faf6f0",
        "on-background": "#2e3230",
        
        surface: "#faf6f0",
        "on-surface": "#2e3230",
        "on-surface-variant": "#4a4e4a",
        "surface-container": "#f0ece4",
        "surface-container-high": "#eae6de",
        "surface-container-highest": "#e4e0d8",
        
        error: "#b83230",
        "on-error": "#ffffff",
        
        outline: "#74796e",
        "outline-variant": "#c4c8bc",
      },
      boxShadow: {
        'terra': '0 4px 20px rgba(46, 50, 48, 0.06)',
        'terra-md': '0 8px 30px rgba(46, 50, 48, 0.1)',
      },
      borderRadius: {
        'terra': '12px',
        'terra-lg': '16px',
        'terra-xl': '24px',
      },
      fontFamily: {
        sans: ['"Nunito Sans"', 'sans-serif'],
        serif: ['Literata', 'serif'],
      },
      lineHeight: {
        'relaxed-terra': '1.625',
      }
    },
  },
  plugins: [],
}
