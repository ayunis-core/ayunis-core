import { useUsageControllerGetUsageConfig } from '@/shared/api';

export function useUsageConfig() {
  return useUsageControllerGetUsageConfig({
    query: {
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: 'always',
      refetchInterval: 5000,
    },
  });
}
