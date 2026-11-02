import { useQuery } from '@tanstack/react-query';
import {
  getModelModesControllerGetModelModesQueryKey,
  modelModesControllerGetModelModes,
} from '@/shared/api';

/** Which model each mode currently resolves to for the signed-in user. */
export function useModelModes() {
  const { data, isLoading, error } = useQuery({
    queryKey: getModelModesControllerGetModelModesQueryKey(),
    queryFn: () => modelModesControllerGetModelModes(),
    // Resolutions follow grants, catalog flags and mode lists, which admins
    // change server-side; a cached copy can point at a model no longer allowed.
    staleTime: 0,
  });
  return { resolutions: data ?? [], isLoading, error };
}
