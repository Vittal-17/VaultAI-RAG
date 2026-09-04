import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import CyphrMark from './ui/CyphrMark';

/** Keep in sync with the fade below, so the node leaves only after it is gone. */
const EXIT_MS = 380;

/**
 * Full-viewport takeover shown while a session is being established — during
 * sign-in and register, and while the app resolves `/api/me` on first paint.
 *
 * It states one thing and does not narrate steps it cannot observe: the client
 * has no visibility into what the server is doing between the request and the
 * response, so inventing a sequence of stages would be fiction. The concentric
 * rings, the breathing mark, the sweeping hairline and every colour here are
 * the same primitives the rest of the product already uses.
 */
const AuthLoadingOverlay = ({ isVisible }) => {
  const [mounted, setMounted] = useState(isVisible);
  const [visible, setVisible] = useState(isVisible);

  // Mount first, fade in on the next frame; on the way out, fade before
  // unmounting. Both the frame and the timer are always cancelled.
  useEffect(() => {
    if (isVisible) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [isVisible]);

  if (!mounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={clsx(
        'fixed inset-0 z-overlay grid place-items-center bg-surface-0/90 px-6 backdrop-blur-xl',
        'transition-opacity duration-emphasized',
        visible ? 'pointer-events-auto opacity-100 ease-standard' : 'pointer-events-none opacity-0 ease-exit'
      )}
    >
      <div className="flex flex-col items-center text-center">
        {/* Concentric rings: structure rings hold the shape, arc rings carry the
            motion. Reduced motion slows them rather than freezing them. */}
        <div className="relative grid h-32 w-32 place-items-center">
          <span className="absolute inset-0 rounded-pill border border-accent/15" aria-hidden="true" />
          <span
            className="absolute inset-0 animate-spin-slow rounded-pill border-2 border-transparent border-t-accent/80"
            aria-hidden="true"
          />
          <span className="absolute inset-3 rounded-pill border border-line-strong/60" aria-hidden="true" />
          <span
            className="absolute inset-3 animate-spin-reverse rounded-pill border-2 border-transparent border-b-azure/70"
            aria-hidden="true"
          />
          <span
            className="absolute inset-[1.375rem] animate-spin-medium rounded-pill border border-transparent border-r-accent-soft/55"
            aria-hidden="true"
          />
          <CyphrMark size={42} withGlow />
        </div>

        <p className="mt-comfortable text-head font-semibold tracking-[0.34em] text-ink">CYPHR</p>
        <p className="eyebrow mt-2 tracking-[0.26em]">System initializing</p>

        {/* Indeterminate progress, the same hairline idiom as document indexing */}
        <span className="relative mt-normal h-px w-40 overflow-hidden bg-line" aria-hidden="true">
          <span className="absolute inset-y-0 w-1/3 animate-sweep-x bg-accent" />
        </span>
      </div>
    </div>
  );
};

export default AuthLoadingOverlay;
