import React, { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertTriangle, Check, Copy } from 'lucide-react';
import clsx from 'clsx';
import CyphrMark from './ui/CyphrMark';
import SourceList from './SourceList';
import { splitSources } from '../lib/citations';

/**
 * One turn in the conversation.
 *
 * The user's turn is a compact right-aligned card; the assistant's answer is
 * set as running text rather than being boxed, so long answers read like a
 * document instead of a stack of panels. The retrieved citations the backend
 * appends to the answer body are lifted out and rendered as source chips.
 *
 * Copy reports the message index back to the thread instead of taking a bound
 * handler: that keeps every prop stable, so `memo` holds and typing in the
 * composer does not re-parse every answer in the conversation.
 */
const ChatMessage = ({ index = 0, role, content, error = false, copied = false, onCopy }) => {
  const isUser = role === 'user';
  const { body, sources } = useMemo(
    () => (isUser ? { body: content, sources: [] } : splitSources(content)),
    [content, isUser]
  );

  if (isUser) {
    return (
      <article className="flex animate-rise-sm justify-end" aria-label="Your message">
        <div className="relative max-w-[85%] rounded-lg rounded-tr-xs border border-accent/25 bg-surface-3/90 px-3.5 py-2.5 text-body text-ink shadow-subtle sm:max-w-[80%]">
          <p className="whitespace-pre-wrap break-words">{content}</p>
        </div>
      </article>
    );
  }

  return (
    <article className="group/message animate-rise-sm" aria-label="CYPHR response">
      <header className="mb-2 flex items-center gap-2">
        <CyphrMark size={17} />
        <span className="eyebrow">CYPHR</span>
        {error && (
          <span className="chip border-danger/30 bg-danger/10 py-0.5 text-label text-danger">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Failed
          </span>
        )}
      </header>

      <div className={clsx('md', error && 'text-ink-dim')}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>

      <SourceList sources={sources} />

      {!error && (
        <div className="mt-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => onCopy?.(index, content)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-label font-medium transition-all duration-fast ease-standard',
              'text-ink-faint hover:bg-surface-3 hover:text-ink',
              'opacity-0 focus-visible:opacity-100 group-hover/message:opacity-100 [@media(hover:none)]:opacity-100',
              copied && 'text-accent opacity-100'
            )}
            aria-label={copied ? 'Response copied' : 'Copy response'}
          >
            {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </article>
  );
};

export default memo(ChatMessage);
