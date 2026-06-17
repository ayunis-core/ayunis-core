import {
  useLetterheadsControllerFindAll,
  getLetterheadsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useLetterheads() {
  const {
    data: letterheads = [],
    isLoading,
    error,
  } = useLetterheadsControllerFindAll({
    query: {
      queryKey: getLetterheadsControllerFindAllQueryKey(),
      staleTime: 30000,
    },
  });

  return { letterheads, isLoading, error };
}
