import {
  getPromptsControllerFindAllQueryKey,
  type PromptsControllerFindAllQueryResult,
  usePromptsControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';

export function usePrompts() {
  const {
    data: prompts = [],
    isLoading,
    error,
    refetch,
  } = usePromptsControllerFindAll<PromptsControllerFindAllQueryResult, Error>({
    query: {
      queryKey: [getPromptsControllerFindAllQueryKey()],
    },
  });

  return {
    prompts,
    isLoading,
    error,
    refetch,
  };
}
