import { useMemo } from 'react';
import { usePermittedModels } from '@/features/usePermittedModels';

export interface ProviderInfo {
  provider: string;
  displayName: string;
}

/**
 * Hook that returns unique providers derived from permitted models.
 * This replaces the old usePermittedProviders hook after the permitted
 * providers concept was removed.
 */
export function useProviders() {
  const { models, isLoading, error } = usePermittedModels();

  const providers = useMemo<ProviderInfo[]>(() => {
    if (!models.length) return [];

    // Get unique providers from permitted models
    const providerMap = new Map<string, string>();
    models.forEach((m) => {
      if (!providerMap.has(m.provider)) {
        providerMap.set(m.provider, m.providerDisplayName);
      }
    });

    return Array.from(providerMap.entries()).map(([provider, displayName]) => ({
      provider,
      displayName,
    }));
  }, [models]);

  return {
    providers,
    isLoading,
    error,
  };
}
