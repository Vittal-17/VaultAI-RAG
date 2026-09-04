import React from 'react';
import { ArrowRight, FileText, Plus, Search, Sparkles, Zap } from 'lucide-react';
import CyphrMark from './ui/CyphrMark';
import { UPLOAD_LIMIT_LABEL } from '../hooks/useDocumentUpload';
import { pluralize } from '../lib/format';

const PROMPTS = [
  { icon: Sparkles, text: 'Summarize the key points' },
  { icon: Search, text: 'What are the main conclusions?' },
  { icon: Zap, text: 'List the important dates and figures' },
];

/**
 * Welcome state for an empty thread. It explains what CYPHR does, how answers
 * are grounded, and gives one obvious next step — which differs depending on
 * whether anything has been indexed yet.
 */
const EmptyChatState = ({ documentCount = 0, onOpenKnowledgeBase, onSelectPrompt }) => {
  const hasDocuments = documentCount > 0;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-thread flex-col items-center justify-center px-4 py-large text-center sm:px-6">
      <div className="relative mb-5">
        <CyphrMark size={58} withGlow />
      </div>

      <h2 className="animate-rise text-title font-semibold tracking-tight text-ink">
        Ask your documents anything
      </h2>
      <p className="mt-2.5 max-w-md animate-rise text-sub leading-relaxed text-ink-dim">
        CYPHR searches the PDFs you have indexed, answers from the passages it retrieves, and cites
        the file and page each answer came from.
      </p>

      {hasDocuments ? (
        <>
          <ul className="mt-comfortable grid w-full max-w-lg gap-2">
            {PROMPTS.map(({ icon: Icon, text }) => (
              <li key={text}>
                <button
                  type="button"
                  onClick={() => onSelectPrompt?.(text)}
                  className="group flex w-full items-center gap-3 rounded-lg border border-line-subtle bg-surface-2/50 px-3.5 py-3 text-left transition-all duration-fast ease-standard hover:border-accent/35 hover:bg-surface-3/70"
                >
                  <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sub text-ink-dim group-hover:text-ink">{text}</span>
                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-ink-faint opacity-0 transition-all duration-fast ease-standard group-hover:translate-x-0 group-hover:text-accent group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-comfortable flex items-center gap-2 text-cap text-ink-faint">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{pluralize(documentCount, 'document')} indexed</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={onOpenKnowledgeBase}
              className="font-medium text-accent transition-colors duration-fast hover:text-accent-soft"
            >
              Manage knowledge base
            </button>
          </div>
        </>
      ) : (
        <div className="panel hairline relative mt-comfortable w-full max-w-md overflow-hidden p-comfortable text-left">
          <p className="text-sub font-medium text-ink">Add a document to get started</p>
          <p className="mt-1.5 text-cap leading-relaxed text-ink-dim">
            CYPHR answers from your own material. Index a PDF and every reply will cite the pages it
            drew from.
          </p>
          <button type="button" onClick={onOpenKnowledgeBase} className="btn btn-primary mt-normal w-full">
            <Plus className="h-4 w-4" />
            Add your first PDF
          </button>
          <p className="mt-2.5 text-label text-ink-faint">{UPLOAD_LIMIT_LABEL}</p>
        </div>
      )}
    </div>
  );
};

export default EmptyChatState;
