import React, { useId } from 'react';
import clsx from 'clsx';

/**
 * The CYPHR mark: a crystalline containment hexagon around an open cipher ring
 * and a signal core. Drawn as a single SVG so it stays crisp from 16px (rail)
 * to 96px (auth / boot screens).
 */
const CyphrMark = ({ className, size, withGlow = false, ...rest }) => {
  const gradientId = useId();

  return (
    <span
      className={clsx('relative inline-flex shrink-0 items-center justify-center', className)}
      style={size ? { width: size, height: size } : undefined}
      {...rest}
    >
      {withGlow && (
        <span
          aria-hidden="true"
          className="glow-orb inset-[-45%] animate-breathe motion-ambient"
        />
      )}
      <svg
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        focusable="false"
        className="relative h-full w-full"
      >
        <defs>
          <linearGradient id={gradientId} x1="4" y1="3" x2="28" y2="29" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgb(var(--c-accent-soft))" />
            <stop offset="0.5" stopColor="rgb(var(--c-accent))" />
            <stop offset="1" stopColor="rgb(var(--c-azure))" />
          </linearGradient>
        </defs>

        {/* Containment hexagon */}
        <path
          d="M16 2.6 L27.6 9.3 V22.7 L16 29.4 L4.4 22.7 V9.3 Z"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.6"
          strokeLinejoin="round"
          opacity="0.9"
        />
        {/* Open cipher ring */}
        <path
          d="M19.73 21.32 A6.5 6.5 0 1 1 19.73 10.68"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Signal core + emission */}
        <circle cx="16" cy="16" r="2.3" fill={`url(#${gradientId})`} />
        <path
          d="M19 16 H24.6"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.65"
        />
      </svg>
    </span>
  );
};

export default CyphrMark;
