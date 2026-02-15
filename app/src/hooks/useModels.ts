import { useState, useCallback } from 'react';
import * as api from '../services/api';
import type { OllamaModel, ProvidersResponse } from '../types/api';

export function useModels() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [providers, setProviders] = useState<ProvidersResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const [modelsRes, providersRes] = await Promise.all([
        api.getModels(),
        api.getProviders(),
      ]);
      setModels(modelsRes.models ?? []);
      setProviders(providersRes);
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
    setLoading(false);
  }, []);

  return { models, providers, loading, fetchModels };
}
