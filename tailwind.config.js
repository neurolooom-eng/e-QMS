/** @type {import('tailwindcss').Config} */
const withOpacity = (v) => ({ opacityValue }) =>
  opacityValue === undefined
    ? `rgb(var(${v}))`
    : `rgb(var(${v}) / ${opacityValue})`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: withOpacity('--c-bg'),
        surface: withOpacity('--c-surface'),
        'surface-2': withOpacity('--c-surface-2'),
        border: withOpacity('--c-border'),
        text: withOpacity('--c-text'),
        muted: withOpacity('--c-muted'),
        primary: withOpacity('--c-primary'),
        'primary-fg': withOpacity('--c-primary-fg'),
        accent: withOpacity('--c-accent'),
        success: withOpacity('--c-success'),
        warning: withOpacity('--c-warning'),
        danger: withOpacity('--c-danger'),
        info: withOpacity('--c-info'),
      },
      borderColor: { DEFAULT: 'rgb(var(--c-border))' },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [],
}
