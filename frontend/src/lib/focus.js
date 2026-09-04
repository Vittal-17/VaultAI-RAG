/**
 * One definition of "what the keyboard can reach", shared by every surface that
 * has to keep Tab inside itself (the dialog primitive and the mobile nav
 * drawer). Keeping it in one place means a focus trap can never disagree with
 * another about which controls exist.
 *
 * Deliberately selector-based rather than a full inert/tabbable implementation:
 * the app only ever traps focus inside small, known panels, so the extra
 * dependency a library would add is not worth its weight.
 */
export const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Focusable descendants of `root` in DOM order, minus anything currently
 * hidden. `offsetParent` is null for `display: none` and `visibility: hidden`
 * subtrees, which is exactly what should drop out of a trap.
 *
 * @param {Element | null | undefined} root
 * @returns {HTMLElement[]}
 */
export function focusablesIn(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
    (node) => node.offsetParent !== null || node === document.activeElement
  );
}

export default FOCUSABLE;
