import React from 'react';

/**
 * The fixed, layered environment behind every view: two coloured light sources,
 * a deep counter-light, a masked technical grid, a horizon glow, film grain and
 * an edge vignette. Entirely decorative and non-interactive — every layer is
 * `pointer-events: none` and animates only transform/opacity.
 *
 * One instance per view is enough; it is fixed to the viewport.
 */
const Atmosphere = () => (
  <div className="atmosphere" aria-hidden="true">
    <span className="atmo-cyan" />
    <span className="atmo-azure" />
    <span className="atmo-deep" />
    <span className="atmo-grid" />
    <span className="atmo-horizon" />
    <span className="atmo-noise" />
    <span className="atmo-vignette" />
  </div>
);

export default Atmosphere;
