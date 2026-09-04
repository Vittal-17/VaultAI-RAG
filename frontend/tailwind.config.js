/** @type {import('tailwindcss').Config} */

/*
 * CYPHR design system — Tailwind theme.
 *
 * Every colour resolves to a CSS custom property declared in `src/index.css`
 * so tokens stay in one place and alpha modifiers (`bg-surface-2/60`) keep
 * working. Components should only ever reference these semantic names.
 */

const channel = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Structural surfaces, deepest → most raised */
        surface: {
          0: channel("--c-surface-0"),
          1: channel("--c-surface-1"),
          2: channel("--c-surface-2"),
          3: channel("--c-surface-3"),
          4: channel("--c-surface-4"),
        },
        /* Borders / dividers */
        line: {
          DEFAULT: channel("--c-line"),
          subtle: channel("--c-line-subtle"),
          strong: channel("--c-line-strong"),
        },
        /* Typography */
        ink: {
          DEFAULT: channel("--c-ink"),
          dim: channel("--c-ink-dim"),
          faint: channel("--c-ink-faint"),
          inverse: channel("--c-ink-inverse"),
        },
        /* Identity: cyan primary, blue secondary */
        accent: {
          DEFAULT: channel("--c-accent"),
          soft: channel("--c-accent-soft"),
          deep: channel("--c-accent-deep"),
        },
        azure: {
          DEFAULT: channel("--c-azure"),
          deep: channel("--c-azure-deep"),
        },
        /* Status */
        success: channel("--c-success"),
        warning: channel("--c-warning"),
        danger: channel("--c-danger"),
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      /* Named type scale — one utility per role in the hierarchy */
      fontSize: {
        display: ["clamp(2rem, 1.4rem + 2.4vw, 2.75rem)", { lineHeight: "1.06", letterSpacing: "-0.028em", fontWeight: "600" }],
        title: ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" }],
        head: ["1.0625rem", { lineHeight: "1.35", letterSpacing: "-0.011em", fontWeight: "600" }],
        body: ["0.9375rem", { lineHeight: "1.68" }],
        sub: ["0.875rem", { lineHeight: "1.55" }],
        cap: ["0.78125rem", { lineHeight: "1.45" }],
        label: ["0.6875rem", { lineHeight: "1.2", letterSpacing: "0.085em", fontWeight: "600" }],
        code: ["0.8125rem", { lineHeight: "1.6" }],
      },
      /* Semantic spacing rhythm */
      spacing: {
        compact: "0.5rem",
        normal: "0.75rem",
        comfortable: "1.25rem",
        large: "2rem",
        section: "3rem",
        rail: "4.25rem",
        sidebar: "17.5rem",
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        "2xl": "22px",
        "3xl": "28px",
        pill: "9999px",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgb(0 0 0 / 0.35)",
        elevated: "0 10px 30px -12px rgb(0 0 0 / 0.65), 0 2px 6px -2px rgb(0 0 0 / 0.4)",
        panel: "0 32px 80px -24px rgb(0 0 0 / 0.8), 0 4px 12px -4px rgb(0 0 0 / 0.5)",
        glow: "0 0 24px -6px rgb(var(--c-accent) / 0.42)",
        "glow-sm": "0 0 14px -4px rgb(var(--c-accent) / 0.5)",
        "glow-lg": "0 0 64px -12px rgb(var(--c-accent) / 0.45)",
        "ring-accent": "0 0 0 1px rgb(var(--c-accent) / 0.35), 0 0 18px -6px rgb(var(--c-accent) / 0.45)",
        hairline: "inset 0 1px 0 0 rgb(255 255 255 / 0.05)",
      },
      transitionDuration: {
        instant: "80ms",
        fast: "140ms",
        normal: "220ms",
        emphasized: "380ms",
        ambient: "1200ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        entrance: "cubic-bezier(0.05, 0.7, 0.1, 1)",
        exit: "cubic-bezier(0.3, 0, 0.8, 0.15)",
        spring: "cubic-bezier(0.34, 1.32, 0.62, 1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        rise: {
          from: { opacity: "0", transform: "translate3d(0, 10px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "rise-sm": {
          from: { opacity: "0", transform: "translate3d(0, 5px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97) translate3d(0, 6px, 0)" },
          to: { opacity: "1", transform: "scale(1) translate3d(0, 0, 0)" },
        },
        "slide-in-left": {
          from: { transform: "translate3d(-100%, 0, 0)" },
          to: { transform: "translate3d(0, 0, 0)" },
        },
        /* Ambient background lighting — very slow, transform/opacity only */
        "drift-a": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: "0.85" },
          "50%": { transform: "translate3d(4%, 3%, 0) scale(1.08)", opacity: "1" },
        },
        "drift-b": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1.05)", opacity: "0.7" },
          "50%": { transform: "translate3d(-5%, -2%, 0) scale(1)", opacity: "0.95" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
        "spin-reverse": {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        "dot-pulse": {
          "0%, 60%, 100%": { opacity: "0.25", transform: "translateY(0)" },
          "30%": { opacity: "1", transform: "translateY(-3px)" },
        },
        "sweep-x": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(300%)" },
        },
        "caret-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.2" },
        },
      },
      animation: {
        "fade-in": "fade-in 220ms cubic-bezier(0.2, 0, 0, 1) both",
        rise: "rise 340ms cubic-bezier(0.05, 0.7, 0.1, 1) both",
        "rise-sm": "rise-sm 220ms cubic-bezier(0.05, 0.7, 0.1, 1) both",
        "scale-in": "scale-in 240ms cubic-bezier(0.05, 0.7, 0.1, 1) both",
        "slide-in-left": "slide-in-left 300ms cubic-bezier(0.05, 0.7, 0.1, 1) both",
        "drift-a": "drift-a 34s ease-in-out infinite",
        "drift-b": "drift-b 46s ease-in-out infinite",
        breathe: "breathe 3.6s ease-in-out infinite",
        "spin-slow": "spin 9s linear infinite",
        "spin-medium": "spin 3.2s linear infinite",
        "spin-reverse": "spin-reverse 5s linear infinite",
        "dot-pulse": "dot-pulse 1.25s ease-in-out infinite",
        "sweep-x": "sweep-x 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        "caret-blink": "caret-blink 1.4s ease-in-out infinite",
      },
      maxWidth: {
        thread: "48rem",
        composer: "48rem",
        panel: "40rem",
      },
      zIndex: {
        atmosphere: "0",
        content: "10",
        chrome: "20",
        drawer: "40",
        modal: "60",
        toast: "80",
        overlay: "100",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
