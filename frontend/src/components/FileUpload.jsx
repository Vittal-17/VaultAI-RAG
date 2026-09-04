import React, { useCallback, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, UploadCloud, X } from 'lucide-react';
import clsx from 'clsx';
import useDocumentUpload, {
  ACCEPTED_EXTENSION,
  UPLOAD_LIMIT_LABEL,
} from '../hooks/useDocumentUpload';
import { formatBytes, splitFilename } from '../lib/format';

/**
 * The knowledge-base dropzone.
 *
 * All upload state lives in `useDocumentUpload` — the same hook the composer's
 * attach control uses — so there is one upload implementation in the app and
 * both entry points behave identically.
 */
const FileUpload = ({ onUploaded }) => {
  const inputRef = useRef(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const upload = useDocumentUpload({ onUploaded });

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

  const { status, progress, file, error } = upload;
  const busy = status === 'uploading' || status === 'indexing';
  const name = splitFilename(file?.name ?? '');

  if (status !== 'idle') {
    return (
      <div
        className={clsx(
          'panel-flat relative overflow-hidden p-3',
          status === 'error' && 'border-danger/40',
          status === 'success' && 'border-success/40'
        )}
        role="status"
      >
        {busy && (
          <div className="absolute inset-x-0 top-0 h-0.5 bg-surface-4" aria-hidden="true">
            {status === 'uploading' ? (
              <div
                className="h-full bg-accent transition-[width] duration-normal ease-standard"
                style={{ width: `${progress}%` }}
              />
            ) : (
              <div className="h-full w-1/3 animate-sweep-x bg-accent" />
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <span
            className={clsx(
              'grid h-9 w-9 shrink-0 place-items-center rounded-md border',
              status === 'error' && 'border-danger/30 bg-danger/10 text-danger',
              status === 'success' && 'border-success/30 bg-success/10 text-success',
              busy && 'border-accent/30 bg-accent/10 text-accent'
            )}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {status === 'success' && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            {status === 'error' && <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          </span>

          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 items-baseline text-sub font-medium text-ink">
              <span className="truncate">{name.stem || 'Selected file'}</span>
              {name.ext && <span className="shrink-0 text-ink-faint">{name.ext}</span>}
            </p>
            <p className={clsx('mt-0.5 text-cap', status === 'error' ? 'text-danger' : 'text-ink-dim')}>
              {status === 'uploading' && `Uploading · ${progress}%${file ? ` of ${formatBytes(file.size)}` : ''}`}
              {status === 'indexing' && 'Extracting text and building embeddings…'}
              {status === 'success' && 'Indexed — answers can cite this document now'}
              {status === 'error' && error}
            </p>
          </div>

          {busy && (
            <button type="button" onClick={upload.cancel} className="icon-btn h-8 w-8 shrink-0" aria-label="Cancel upload">
              <X className="h-4 w-4" />
            </button>
          )}
          {status === 'error' && (
            <button type="button" onClick={upload.reset} className="btn btn-secondary btn-sm shrink-0">
              Try another
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
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
        onClick={() => inputRef.current?.click()}
        onDragEnter={onDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={clsx(
          'flex w-full flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center',
          'transition-all duration-fast ease-standard',
          dragging
            ? 'border-accent/70 bg-accent/10 shadow-glow-sm scale-[1.02]'
            : 'border-line-strong bg-surface-2/40 hover:border-accent/45 hover:bg-surface-2/70 hover:shadow-subtle hover:-translate-y-px'
        )}
      >
        <span
          className={clsx(
            'mb-1 grid h-10 w-10 place-items-center rounded-md border text-accent transition-colors duration-fast',
            dragging ? 'border-accent/50 bg-accent/15 scale-110' : 'border-line bg-surface-3/70'
          )}
        >
          <UploadCloud className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-sub font-medium text-ink">
          {dragging ? 'Drop to index this PDF' : 'Drop a PDF here, or click to browse'}
        </span>
        <span className="text-cap text-ink-faint">{UPLOAD_LIMIT_LABEL}</span>
      </button>
    </>
  );
};

export default FileUpload;
