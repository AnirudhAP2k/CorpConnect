/** @type {import('tailwindcss').Config} */
import { withUt } from 'uploadthing/tw';

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
        // Primary (Deep Navy)
        'nx-primary': '#041627',
        'nx-primary-container': '#1a2b3c',
        'nx-primary-fixed': '#d2e4fb',
        'nx-primary-fixed-dim': '#b7c8de',
        'nx-on-primary': '#ffffff',
        'nx-on-primary-container': '#8192a7',
        'nx-on-primary-fixed': '#0b1d2d',
        'nx-on-primary-fixed-var': '#38485a',
        'nx-inverse-primary': '#b7c8de',
        // Secondary (Slate Blue)
        'nx-secondary': '#545f72',
        'nx-secondary-container': '#d5e0f7',
        'nx-secondary-fixed': '#d8e3fa',
        'nx-secondary-fixed-dim': '#bcc7dd',
        'nx-on-secondary': '#ffffff',
        'nx-on-secondary-container': '#586377',
        'nx-on-secondary-fixed': '#111c2c',
        'nx-on-secondary-fixed-var': '#3c475a',
        // Tertiary (Professional Blue Accent)
        'nx-tertiary': '#00162c',
        'nx-tertiary-container': '#002b4e',
        'nx-tertiary-fixed': '#d2e4ff',
        'nx-tertiary-fixed-dim': '#9fcaff',
        'nx-on-tertiary': '#ffffff',
        'nx-on-tertiary-container': '#4894e2',
        'nx-on-tertiary-fixed': '#001d37',
        'nx-on-tertiary-fixed-var': '#00497e',
        // Surface (Warm Neutral)
        'nx-surface': '#fbf9fa',
        'nx-surface-dim': '#dbd9db',
        'nx-surface-bright': '#fbf9fa',
        'nx-surface-tint': '#4f6073',
        'nx-surface-variant': '#e4e2e3',
        'nx-surface-container-low': '#f5f3f4',
        'nx-surface-container': '#efedef',
        'nx-surface-container-high': '#e9e7e9',
        'nx-surface-container-highest': '#e4e2e3',
        'nx-surface-container-lowest': '#ffffff',
        'nx-inverse-surface': '#303032',
        'nx-inverse-on-surface': '#f2f0f2',
        // On Surface
        'nx-on-surface': '#1b1c1d',
        'nx-on-surface-variant': '#44474c',
        // Background
        'nx-background': '#fbf9fa',
        'nx-on-background': '#1b1c1d',
        // Outline
        'nx-outline': '#74777d',
        'nx-outline-variant': '#c4c6cd',
        // Error
        'nx-error': '#ba1a1a',
        'nx-error-container': '#ffdad6',
        'nx-on-error': '#ffffff',
        'nx-on-error-container': '#93000a',
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
        // Nexus Corporate signature gradient
        'nx-cta-gradient': 'linear-gradient(135deg, #041627 0%, #1a2b3c 100%)',
        'nx-accent-gradient': 'linear-gradient(135deg, #002b4e 0%, #4894e2 100%)',
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
  plugins: [require('tailwindcss-animate')],
});