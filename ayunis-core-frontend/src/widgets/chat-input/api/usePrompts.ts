import {
  getPromptsControllerFindAllQueryKey,
  type PromptsControllerFindAllQueryResult,
  usePromptsControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';

interface UsePromptsOptions {
  enabled?: boolean;
}

export function usePrompts(options: UsePromptsOptions = {}) {
  const { enabled = true } = options;
  const {
    data: prompts = [],
    isLoading,
    error,
    refetch,
  } = usePromptsControllerFindAll<PromptsControllerFindAllQueryResult, Error>({
    query: {
      queryKey: [getPromptsControllerFindAllQueryKey()],
      enabled,
    },
  });

  return {
    prompts,
    isLoading,
    error,
    refetch,
  };
}
