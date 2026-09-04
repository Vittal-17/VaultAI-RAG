import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatBytes } from '../lib/format';
import { errorDetail } from '../lib/errors';

/*
 * Client-side guards mirror the backend's defaults purely so users get instant
 * feedback. The server (`/upload`) remains the authority: it re-checks the
 * extension, the byte ceiling (MAX_PDF_SIZE_MB), the page count and the chunk
 * count, and nothing here weakens any of that.
 */
export const ACCEPTED_EXTENSION = '.pdf';
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Every place that advertises the limit reads it from the limit itself. */
export const UPLOAD_LIMIT_LABEL = `PDF only · up to ${formatBytes(MAX_UPLOAD_BYTES)}`;

const IDLE = Object.freeze({
  status: 'idle', // idle | uploading | indexing | success | error
  progress: 0,
  file: null,
  error: null,
});

/**
 * Single owner of the document-upload flow. Both the Knowledge Base panel and
 * the composer's attach control call this, so there is exactly one upload
 * implementation in the app.
 *
 * @param {{ onUploaded?: (filename: string) => void }} options
 */
export function useDocumentUpload({ onUploaded } = {}) {
  const [state, setState] = useState(IDLE);
  const controllerRef = useRef(null);
  const resetTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const onUploadedRef = useRef(onUploaded);

  onUploadedRef.current = onUploaded;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const reset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
    setState(IDLE);
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    reset();
  }, [reset]);

  /** @param {File} file */
  const validate = useCallback((file) => {
    if (!file) return 'No file selected.';
    if (!file.name.toLowerCase().endsWith(ACCEPTED_EXTENSION)) {
      return 'Only PDF files can be added to the knowledge base.';
    }
    if (file.size === 0) return 'That file is empty.';
    if (file.size > MAX_UPLOAD_BYTES) {
      return `That PDF is larger than ${formatBytes(MAX_UPLOAD_BYTES)}.`;
    }
    return null;
  }, []);
  /**
   * @param {File} file
   * @returns {Promise<boolean>} whether the document was indexed
   */
  const upload = useCallback(
    async (file) => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }

      const invalid = validate(file);
      if (invalid) {
        setState({ status: 'error', progress: 0, file: file ?? null, error: invalid });
        toast.error(invalid);
        return false;
      }

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setState({ status: 'uploading', progress: 0, file, error: null });

      const body = new FormData();
      body.append('file', file);

      try {
        await axios.post('/upload', body, {
          headers: { 'Content-Type': 'multipart/form-data' },
          signal: controller.signal,
          onUploadProgress: (event) => {
            if (!mountedRef.current || controllerRef.current !== controller) return;
            const total = event.total ?? file.size;
            const ratio = total ? Math.min(1, event.loaded / total) : 0;
            // Bytes are only half the story — the server still has to extract,
            // chunk and embed, so a completed transfer becomes "indexing".
            setState((prev) =>
              prev.status === 'uploading' || prev.status === 'indexing'
                ? {
                    ...prev,
                    status: ratio >= 1 ? 'indexing' : 'uploading',
                    progress: Math.round(ratio * 100),
                  }
                : prev
            );
          },
        });

        if (!mountedRef.current || controllerRef.current !== controller) return false;
        controllerRef.current = null;
        setState({ status: 'success', progress: 100, file, error: null });
        onUploadedRef.current?.(file.name);
        toast.success(`${file.name} added to your knowledge base`);
        resetTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setState(IDLE);
        }, 2600);
        return true;
      } catch (error) {
        const aborted = axios.isCancel?.(error) || error?.code === 'ERR_CANCELED';
        if (aborted || !mountedRef.current || controllerRef.current !== controller) return false;
        controllerRef.current = null;
        const message = errorDetail(error, 'Upload failed. Check your connection and try again.');
        setState({ status: 'error', progress: 0, file, error: message });
        toast.error(message);
        return false;
      }
    },
    [validate]
  );

  return { ...state, upload, reset, cancel, validate };
}

export default useDocumentUpload;
