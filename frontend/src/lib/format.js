/** Small formatting helpers shared across the UI. */

/**
 * The backend serialises naive UTC datetimes (`datetime.utcnow()`), which have
 * no zone designator. `new Date()` would read those as local time, so the
 * designator is added back before parsing.
 *
 * @param {unknown} value
 * @returns {Date|null}
 */
export function parseServerDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const hasZone = /(?:Z|z|[+-]\d{2}:?\d{2})$/.test(trimmed);
  const date = new Date(hasZone ? trimmed : `${trimmed}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const DAY_MS = 86_400_000;

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Buckets conversations into recency sections for the sidebar. Order within a
 * bucket is preserved, so the server's newest-first ordering is respected.
 * Conversations with no `created_at` (freshly created ones — `/api/chats/new`
 * does not return a timestamp) are treated as brand new.
 *
 * @param {Array<{chat_id: string, created_at?: string}>} chats
 * @returns {Array<{ id: string, label: string, chats: Array<object> }>}
 */
export function groupChatsByRecency(chats) {
  const buckets = [
    { id: 'today', label: 'Today', chats: [] },
    { id: 'yesterday', label: 'Yesterday', chats: [] },
    { id: 'week', label: 'Previous 7 days', chats: [] },
    { id: 'month', label: 'Previous 30 days', chats: [] },
    { id: 'older', label: 'Older', chats: [] },
  ];
  const byId = Object.fromEntries(buckets.map((bucket) => [bucket.id, bucket]));
  const today = startOfLocalDay(new Date());

  for (const chat of chats) {
    const created = parseServerDate(chat?.created_at);
    if (!created) {
      byId.today.chats.push(chat);
      continue;
    }
    const days = Math.round((today - startOfLocalDay(created)) / DAY_MS);
    if (days <= 0) byId.today.chats.push(chat);
    else if (days === 1) byId.yesterday.chats.push(chat);
    else if (days <= 7) byId.week.chats.push(chat);
    else if (days <= 30) byId.month.chats.push(chat);
    else byId.older.chats.push(chat);
  }

  return buckets.filter((bucket) => bucket.chats.length > 0);
}

/**
 * Splits a filename so the extension can be pinned while the stem truncates
 * with an ellipsis — long names never break the layout, and the file type
 * always stays visible.
 *
 * @param {string} filename
 */
export function splitFilename(filename) {
  const name = typeof filename === 'string' ? filename : '';
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return { stem: name, ext: '' };
  return { stem: name.slice(0, dot), ext: name.slice(dot) };
}

/** @param {number} bytes */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/** Pluralises a count without importing an i18n library. */
export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
