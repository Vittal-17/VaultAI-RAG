import React, { useMemo, useState } from 'react';
import { FileText, Library } from 'lucide-react';
import { splitFilename } from '../lib/format';

const COLLAPSED_COUNT = 3;

/** Numeric-first ordering, so "Page 2" precedes "Page 10". */
const byPage = (a, b) => {
  const left = Number.parseInt(a, 10);
  const right = Number.parseInt(b, 10);
  if (Number.isNaN(left) || Number.isNaN(right)) return String(a).localeCompare(String(b));
  return left - right;
};

/**
 * Citations for one answer. The retrieval layer reports a filename and a page
 * per chunk; several chunks routinely come from the same document, so they are
 * merged into one chip per file with every cited page listed. Nothing is shown
 * that the backend did not send.
 */
const SourceList = ({ sources }) => {
  const [expanded, setExpanded] = useState(false);

  const documents = useMemo(() => {
    const byFilename = new Map();
    for (const source of sources ?? []) {
      if (!source?.filename) continue;
      if (!byFilename.has(source.filename)) {
        byFilename.set(source.filename, { filename: source.filename, pages: [] });
      }
      const entry = byFilename.get(source.filename);
      const page = source.page ? String(source.page).trim() : '';
      if (page && !entry.pages.includes(page)) entry.pages.push(page);
    }
    return Array.from(byFilename.values(), (entry) => ({
      ...entry,
      pages: entry.pages.sort(byPage),
    }));
  }, [sources]);

  if (documents.length === 0) return null;

  const overflow = documents.length - COLLAPSED_COUNT;
  const visible = expanded ? documents : documents.slice(0, COLLAPSED_COUNT);

  return (
    <section className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1.5" aria-label="Sources">
      <span className="eyebrow inline-flex items-center gap-1.5">
        <Library className="h-3 w-3 text-accent" aria-hidden="true" />
        Sources
      </span>

      <ul className="flex flex-wrap items-center gap-1.5">
        {visible.map(({ filename, pages }) => {
          const { stem, ext } = splitFilename(filename);
          return (
            <li key={filename} className="min-w-0">
              <span
                className="chip max-w-full gap-1.5 border-line-subtle bg-surface-2/80 py-1 pl-2 pr-2.5 transition-all duration-fast ease-standard hover:-translate-y-px hover:shadow-subtle hover:border-line-strong cursor-default"
                title={pages.length > 0 ? `${filename} — page ${pages.join(', ')}` : filename}
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-accent/80" aria-hidden="true" />
                <span className="flex min-w-0 items-baseline">
                  <span className="max-w-[11rem] truncate text-cap text-ink sm:max-w-[16rem]">{stem}</span>
                  {ext && <span className="shrink-0 text-cap text-ink-faint">{ext}</span>}
                </span>
                {pages.length > 0 && (
                  <span className="tabular shrink-0 border-l border-line-subtle pl-1.5 text-label font-medium text-accent">
                    {pages.length > 1 ? 'pp.' : 'p.'} {pages.join(', ')}
                  </span>
                )}
              </span>
            </li>
          );
        })}

        {overflow > 0 && (
          <li>
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              className="chip border-dashed text-cap text-ink-dim transition-colors duration-fast ease-standard hover:border-accent/40 hover:text-accent"
            >
              {expanded ? 'Show fewer' : `+${overflow} more`}
            </button>
          </li>
        )}
      </ul>
    </section>
  );
};

export default SourceList;
