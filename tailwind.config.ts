/** @type {import('tailwindcss').Config} */
import { withUt } from 'uploadthing/tw';
import tailwindcssAnimate from 'tailwindcss-animate';

// Nexus Corporate Design System — sourced from Stitch (B2B Network Redesign)
module.exports = withUt({
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // ── Shadcn UI / Radix Compatibility ──────────────────────────────────
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          // Legacy shades — kept for backward compat with existing components
          // (new components should use nx-* tokens)
          50: '#f5f3f4',   // maps to nx-surface-container-low
          400: '#AFAFAF',
          500: '#041627',   // maps to nx-primary
          600: '#1a2b3c',   // maps to nx-primary-container
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // ── Nexus Corporate Semantic Tokens ──────────────────────────────────
        // All values reference CSS custom properties (RGB channels) for
        // theme-awareness. Tailwind opacity modifiers (e.g. bg-nx-primary/80)
        // work correctly because values are space-separated RGB.
        // Primary (Deep Navy)
        'nx-primary': 'rgb(var(--nx-primary) / <alpha-value>)',
        'nx-primary-container': 'rgb(var(--nx-primary-container) / <alpha-value>)',
        'nx-primary-fixed': 'rgb(var(--nx-primary-fixed) / <alpha-value>)',
        'nx-primary-fixed-dim': 'rgb(var(--nx-primary-fixed-dim) / <alpha-value>)',
        'nx-on-primary': 'rgb(var(--nx-on-primary) / <alpha-value>)',
        'nx-on-primary-container': 'rgb(var(--nx-on-primary-container) / <alpha-value>)',
        'nx-on-primary-fixed': 'rgb(var(--nx-on-primary-fixed) / <alpha-value>)',
        'nx-on-primary-fixed-var': 'rgb(var(--nx-on-primary-fixed-var) / <alpha-value>)',
        'nx-inverse-primary': 'rgb(var(--nx-inverse-primary) / <alpha-value>)',
        // Secondary (Slate Blue)
        'nx-secondary': 'rgb(var(--nx-secondary) / <alpha-value>)',
        'nx-secondary-container': 'rgb(var(--nx-secondary-container) / <alpha-value>)',
        'nx-secondary-fixed': 'rgb(var(--nx-secondary-fixed) / <alpha-value>)',
        'nx-secondary-fixed-dim': 'rgb(var(--nx-secondary-fixed-dim) / <alpha-value>)',
        'nx-on-secondary': 'rgb(var(--nx-on-secondary) / <alpha-value>)',
        'nx-on-secondary-container': 'rgb(var(--nx-on-secondary-container) / <alpha-value>)',
        'nx-on-secondary-fixed': 'rgb(var(--nx-on-secondary-fixed) / <alpha-value>)',
        'nx-on-secondary-fixed-var': 'rgb(var(--nx-on-secondary-fixed-var) / <alpha-value>)',
        // Tertiary (Professional Blue Accent)
        'nx-tertiary': 'rgb(var(--nx-tertiary) / <alpha-value>)',
        'nx-tertiary-container': 'rgb(var(--nx-tertiary-container) / <alpha-value>)',
        'nx-tertiary-fixed': 'rgb(var(--nx-tertiary-fixed) / <alpha-value>)',
        'nx-tertiary-fixed-dim': 'rgb(var(--nx-tertiary-fixed-dim) / <alpha-value>)',
        'nx-on-tertiary': 'rgb(var(--nx-on-tertiary) / <alpha-value>)',
        'nx-on-tertiary-container': 'rgb(var(--nx-on-tertiary-container) / <alpha-value>)',
        'nx-on-tertiary-fixed': 'rgb(var(--nx-on-tertiary-fixed) / <alpha-value>)',
        'nx-on-tertiary-fixed-var': 'rgb(var(--nx-on-tertiary-fixed-var) / <alpha-value>)',
        // Surface (Warm Neutral)
        'nx-surface': 'rgb(var(--nx-surface) / <alpha-value>)',
        'nx-surface-dim': 'rgb(var(--nx-surface-dim) / <alpha-value>)',
        'nx-surface-bright': 'rgb(var(--nx-surface-bright) / <alpha-value>)',
        'nx-surface-tint': 'rgb(var(--nx-surface-tint) / <alpha-value>)',
        'nx-surface-variant': 'rgb(var(--nx-surface-variant) / <alpha-value>)',
        'nx-surface-container-low': 'rgb(var(--nx-surface-container-low) / <alpha-value>)',
        'nx-surface-container': 'rgb(var(--nx-surface-container) / <alpha-value>)',
        'nx-surface-container-high': 'rgb(var(--nx-surface-container-high) / <alpha-value>)',
        'nx-surface-container-highest': 'rgb(var(--nx-surface-container-highest) / <alpha-value>)',
        'nx-surface-container-lowest': 'rgb(var(--nx-surface-container-lowest) / <alpha-value>)',
        'nx-inverse-surface': 'rgb(var(--nx-inverse-surface) / <alpha-value>)',
        'nx-inverse-on-surface': 'rgb(var(--nx-inverse-on-surface) / <alpha-value>)',
        // On Surface
        'nx-on-surface': 'rgb(var(--nx-on-surface) / <alpha-value>)',
        'nx-on-surface-variant': 'rgb(var(--nx-on-surface-variant) / <alpha-value>)',
        // Background
        'nx-background': 'rgb(var(--nx-background) / <alpha-value>)',
        'nx-on-background': 'rgb(var(--nx-on-background) / <alpha-value>)',
        // Outline
        'nx-outline': 'rgb(var(--nx-outline) / <alpha-value>)',
        'nx-outline-variant': 'rgb(var(--nx-outline-variant) / <alpha-value>)',
        // Error
        'nx-error': 'rgb(var(--nx-error) / <alpha-value>)',
        'nx-error-container': 'rgb(var(--nx-error-container) / <alpha-value>)',
        'nx-on-error': 'rgb(var(--nx-on-error) / <alpha-value>)',
        'nx-on-error-container': 'rgb(var(--nx-on-error-container) / <alpha-value>)',
        // Success
        'nx-success': 'rgb(var(--nx-success) / <alpha-value>)',
        'nx-success-container': 'rgb(var(--nx-success-container) / <alpha-value>)',
        'nx-on-success': 'rgb(var(--nx-on-success) / <alpha-value>)',
        'nx-on-success-container': 'rgb(var(--nx-on-success-container) / <alpha-value>)',
        // Warning
        'nx-warning': 'rgb(var(--nx-warning) / <alpha-value>)',
        'nx-warning-container': 'rgb(var(--nx-warning-container) / <alpha-value>)',
        'nx-on-warning': 'rgb(var(--nx-on-warning) / <alpha-value>)',
        'nx-on-warning-container': 'rgb(var(--nx-on-warning-container) / <alpha-value>)',
        // ── Legacy grey tokens (kept for backward compat) ─────────────────
        grey: {
          600: '#545454',
          500: '#757575',
          400: '#AFAFAF',
          50: '#F6F6F6',
        },
      },
      fontFamily: {
        // Nexus Corporate dual-font system
        headline: ['var(--font-manrope)', 'Manrope', 'sans-serif'],
        body: ['var(--font-inter)', 'Inter', 'sans-serif'],
        label: ['var(--font-inter)', 'Inter', 'sans-serif'],
        // Legacy
        poppins: ['var(--font-poppins)'],
      },
      backgroundImage: {
        'dotted-pattern': "url('/assets/images/dotted-pattern.png')",
        'hero-img': "url('/assets/images/hero.png')",
        // Nexus Corporate signature gradient (uses CSS vars for theme-awareness)
        'nx-cta-gradient': 'linear-gradient(135deg, rgb(var(--nx-primary)) 0%, rgb(var(--nx-primary-container)) 100%)',
        'nx-accent-gradient': 'linear-gradient(135deg, rgb(var(--nx-tertiary-container)) 0%, rgb(var(--nx-on-tertiary-container)) 100%)',
      },
      borderRadius: {
        // Nexus Corporate — 8px base roundness
        DEFAULT: '0.25rem',
        sm: 'calc(var(--radius) - 4px)',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
      boxShadow: {
        // Nexus Corporate: tinted ambient shadows, never pure black
        'nx-card': '0px 12px 32px rgba(27, 28, 29, 0.04)',
        'nx-float': '0px 20px 48px rgba(27, 28, 29, 0.08)',
        'nx-primary': '0px 8px 24px rgba(4, 22, 39, 0.20)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
});