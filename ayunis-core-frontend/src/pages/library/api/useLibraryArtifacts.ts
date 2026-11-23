import {
  getArtifactsControllerFindPersonalQueryKey,
  useArtifactsControllerFindPersonal,
} from '@/shared/api';
import type { ArtifactsControllerFindPersonalType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { LIBRARY_PAGE_SIZE } from '@/pages/library/model/constants';

interface UseLibraryArtifactsParams {
  search?: string;
  type?: ArtifactsControllerFindPersonalType;
  page: number;
}

export function useLibraryArtifacts({
  search,
  type,
  page,
}: UseLibraryArtifactsParams) {
  const params = {
    search,
    type,
    limit: LIBRARY_PAGE_SIZE,
    offset: (page - 1) * LIBRARY_PAGE_SIZE,
  };
  const { data, isLoading, error } = useArtifactsControllerFindPersonal(
    params,
    {
      query: {
        queryKey: getArtifactsControllerFindPersonalQueryKey(params),
      },
    },
  );

  return {
    artifacts: data?.data ?? [],
    total: data?.pagination.total ?? 0,
    isLoading,
    error,
  };
}
