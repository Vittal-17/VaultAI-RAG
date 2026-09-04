import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Database, Loader2, Paperclip, Send, UploadCloud, X } from 'lucide-react';
import clsx from 'clsx';
import useDocumentUpload, { ACCEPTED_EXTENSION } from '../hooks/useDocumentUpload';
import { pluralize, splitFilename } from '../lib/format';

const MAX_TEXTAREA_HEIGHT = 200;

/**
 * The composer. It anchors the bottom of the thread and owns three things:
 * writing a message, sending it, and adding a PDF to the knowledge base.
 *
 * The attach control is wired to the same upload hook the Knowledge Base panel
 * uses — there is one upload implementation in the app, not two.
 */
const Composer = ({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  documentCount = 0,
  modelLabel,
  onOpenKnowledgeBase,
  onDocumentUploaded,
}) => {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const upload = useDocumentUpload({ onUploaded: onDocumentUploaded });

  // Grow with the content up to a ceiling, then scroll.
  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !isLoading;

  const submit = useCallback(
    (event) => {
      event?.preventDefault();
      if (!canSend) return;
      onSubmit();
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
    [canSend, onSubmit]
  );

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const handleFiles = useCallback(
    (files) => {
      const file = files?.[0];
      if (file) upload.upload(file);
    },
    [upload]
  );

  const onDragEnter = (event) => {
    if (!event.dataTransfer?.types?.includes('Files')) return;
    dragDepth.current += 1;
    setDragging(true);
  };

  const onDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  const onDrop = (event) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    handleFiles(event.dataTransfer?.files);
  };

  const busy = upload.status === 'uploading' || upload.status === 'indexing';
  const uploadName = upload.file ? splitFilename(upload.file.name).stem : '';

  return (
    <div className="relative shrink-0 bg-gradient-to-t from-surface-0 via-surface-0/90 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pb-4">
      <div className="mx-auto w-full max-w-composer">
        <form
          onSubmit={submit}
          onDragEnter={onDragEnter}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={clsx(
            'panel hairline relative overflow-hidden transition-[border-color,box-shadow] duration-normal ease-standard',
            'focus-within:border-accent/45 focus-within:shadow-glow-sm',
            dragging && 'border-accent/70 shadow-glow'
          )}
        >
          {busy && (
            <div className="absolute inset-x-0 top-0 h-0.5 bg-surface-4" aria-hidden="true">
              <div
                className="h-full bg-accent transition-[width] duration-normal ease-standard"
                style={{ width: `${upload.status === 'indexing' ? 100 : upload.progress}%` }}
              />
            </div>
          )}

          <label htmlFor="composer-input" className="sr-only">
            Ask a question about your documents
          </label>
          <textarea
            id="composer-input"
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your documents…"
            className="scroll-thin block w-full resize-none bg-transparent px-3.5 pb-1.5 pt-3 text-body text-ink placeholder:text-ink-faint focus:outline-none"
            style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
          />

          <div className="flex items-center gap-1.5 px-2 pb-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={`application/pdf,${ACCEPTED_EXTENSION}`}
              className="hidden"
              onChange={(event) => {
                handleFiles(event.target.files);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="icon-btn icon-btn-accent tip h-8 w-8"
              data-tip="Add a PDF to your knowledge base"
              aria-label="Add a PDF to your knowledge base"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onOpenKnowledgeBase}
              className="tip inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-cap text-ink-dim transition-all duration-fast ease-standard hover:-translate-y-px hover:shadow-subtle hover:bg-surface-3 hover:text-ink"
              data-tip="Open knowledge base"
              aria-label={`Open knowledge base, ${pluralize(documentCount, 'document')} indexed`}
            >
              <Database className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              <span className="tabular font-medium">{documentCount}</span>
            </button>

            {busy && (
              <span className="chip min-w-0 max-w-[13rem] border-accent/25 bg-accent/10 py-1 text-label text-accent">
                <span className="truncate">
                  {upload.status === 'indexing' ? 'Indexing' : 'Uploading'} {uploadName}
                </span>
                {upload.status === 'uploading' && <span className="tabular shrink-0">{upload.progress}%</span>}
                <button
                  type="button"
                  onClick={upload.cancel}
                  className="-mr-1 shrink-0 rounded-sm p-0.5 hover:bg-accent/15"
                  aria-label="Cancel upload"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <div className="flex-1" />

            {modelLabel && (
              <span className="hidden max-w-[10rem] truncate text-label text-ink-faint md:inline">{modelLabel}</span>
            )}

            <button
              type="submit"
              disabled={!canSend}
              className="icon-btn icon-btn-primary tip tip-above h-9 w-9"
              data-tip="Send · Enter"
              aria-label="Send message"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>

          {dragging && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl border-2 border-dashed border-accent/60 bg-surface-1/95 backdrop-blur-sm">
              <span className="flex items-center gap-2 text-sub font-medium text-accent">
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                Drop a PDF to index it
              </span>
            </div>
          )}
        </form>

        <p className="mt-2 text-center text-label text-ink-faint">
          Answers are grounded in your indexed documents — verify anything important.
        </p>
      </div>
    </div>
  );
};

export default Composer;
