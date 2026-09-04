/**
 * One place to turn an axios failure into something safe to display.
 *
 * FastAPI sends `detail` as a string for the errors this app raises
 * deliberately (`HTTPException`), but as an array of objects for request
 * validation failures. Rendering that array would crash React, and a raw
 * validation payload means nothing to a reader, so anything that is not a
 * non-empty string falls back to the caller's message.
 *
 * @param {unknown} error the value caught from an axios call
 * @param {string} fallback human-readable message for anything unexpected
 * @returns {string}
 */
export function errorDetail(error, fallback) {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' && detail.trim() ? detail : fallback;
}

export default errorDetail;
