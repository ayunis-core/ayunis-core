import {
  getPromptsControllerFindAllQueryKey,
  usePromptsControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';

export function usePrompts() {
  const {
    data: prompts = [],
    isLoading,
    error,
    refetch,
  } = usePromptsControllerFindAll({
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
