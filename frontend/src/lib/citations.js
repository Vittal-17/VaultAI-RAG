/**
 * Parses the trailing sources block that the backend appends to every
 * assistant answer so the frontend can render it as first-class UI instead of
 * markdown.
 *
 * The backend (services.py) emits exactly:
 *
 *     <answer>\n\n### 📚 Sources:\n- **file.pdf** (Page 3)\n- **other.pdf** (Page 1)
 *
 * Parsing is deliberately conservative: if the block after the heading does
 * not look like a citation list, the original content is returned untouched
 * and rendered as ordinary markdown. No data is inferred or invented — only
 * what the model/backend already produced is surfaced.
 */

const SOURCES_HEADING =
  /(?:^|\n)[ \t]*#{1,6}[ \t]*(?:[\p{Extended_Pictographic}️‍]+[ \t]*)?sources[ \t]*:?[ \t]*\n/giu;

const SOURCE_LINE = /^[ \t]*[-*+][ \t]*(?:\*\*|__)?(.+?)(?:\*\*|__)?[ \t]*(?:\((?:page|pg\.?|p\.?)[ \t]*([^)]+)\))?[ \t]*$/i;

const EMPTY = Object.freeze([]);

/**
 * @param {string} content raw assistant message content
 * @returns {{ body: string, sources: Array<{ filename: string, page: string|null }> }}
 */
export function splitSources(content) {
  if (typeof content !== 'string' || !content.includes('\n')) {
    return { body: typeof content === 'string' ? content : '', sources: EMPTY };
  }

  // Use the *last* heading: an answer may legitimately discuss the word
  // "sources" earlier on, but the backend always appends its block at the end.
  let match = null;
  SOURCES_HEADING.lastIndex = 0;
  for (let found = SOURCES_HEADING.exec(content); found; found = SOURCES_HEADING.exec(content)) {
    match = found;
  }
  if (!match) return { body: content, sources: EMPTY };

  const body = content.slice(0, match.index);
  const tail = content.slice(match.index + match[0].length);

  const lines = tail.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { body: content, sources: EMPTY };

  const sources = [];
  const seen = new Set();
  for (const line of lines) {
    const parsed = SOURCE_LINE.exec(line);
    // A single unparseable line means this is prose, not a citation block.
    if (!parsed) return { body: content, sources: EMPTY };

    const filename = parsed[1].trim().replace(/^\*+|\*+$/g, '').trim();
    if (!filename) return { body: content, sources: EMPTY };

    const page = parsed[2] ? parsed[2].trim() : null;
    const key = `${filename}::${page ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ filename, page });
  }

  if (sources.length === 0) return { body: content, sources: EMPTY };
  return { body: body.trimEnd(), sources };
}
