import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

/**
 * Loads the backend's public LLM catalogue and owns the provider/model
 * selection for the session.
 *
 * The endpoint requires authentication, so the caller passes `enabled` instead
 * of the hook being called conditionally.
 *
 * @param {boolean} enabled
 */
export function useProviders(enabled) {
  const [providers, setProviders] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [selection, setSelection] = useState({ providerId: '', modelId: '' });

  useEffect(() => {
    if (!enabled) {
      setProviders((prev) => (prev.length ? [] : prev));
      setStatus((prev) => (prev === 'idle' ? prev : 'idle'));
      setSelection((prev) => (prev.providerId || prev.modelId ? { providerId: '', modelId: '' } : prev));
      return undefined;
    }

    const controller = new AbortController();
    let active = true;
    setStatus('loading');

    axios
      .get('/api/llm/providers', { signal: controller.signal })
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res.data?.providers) ? res.data.providers : [];
        setProviders(list);

        if (list.length === 0) {
          setSelection({ providerId: '', modelId: '' });
          setStatus('ready');
          return;
        }

        const preferred =
          list.find((provider) => provider.id === res.data?.default_provider) ?? list[0];
        const models = Array.isArray(preferred.models) ? preferred.models : [];
        const preferredModel =
          models.find((model) => model.id === res.data?.default_model) ?? models[0];

        setSelection({
          providerId: preferred.id,
          modelId: preferredModel?.id ?? '',
        });
        setStatus('ready');
      })
      .catch((error) => {
        if (!active || axios.isCancel?.(error) || error?.code === 'ERR_CANCELED') return;
        setStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled]);

  // Mirror of `providers` so `selectProvider` can stay a stable callback
  // without reading state inside a setState updater.
  const providersRef = useRef(providers);
  useEffect(() => {
    providersRef.current = providers;
  }, [providers]);

  const selectProvider = useCallback((providerId) => {
    const provider = providersRef.current.find((entry) => entry.id === providerId);
    setSelection({ providerId, modelId: provider?.models?.[0]?.id ?? '' });
  }, []);

  const selectModel = useCallback((modelId) => {
    setSelection((prev) => ({ ...prev, modelId }));
  }, []);

  const activeProvider = useMemo(
    () => providers.find((provider) => provider.id === selection.providerId) ?? null,
    [providers, selection.providerId]
  );

  const activeModel = useMemo(
    () => activeProvider?.models?.find((model) => model.id === selection.modelId) ?? null,
    [activeProvider, selection.modelId]
  );

  return {
    providers,
    status,
    providerId: selection.providerId,
    modelId: selection.modelId,
    activeProvider,
    activeModel,
    selectProvider,
    selectModel,
  };
}

export default useProviders;
