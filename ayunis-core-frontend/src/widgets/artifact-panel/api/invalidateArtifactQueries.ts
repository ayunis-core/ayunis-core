import type { QueryClient } from '@tanstack/react-query';
import { getArtifactsControllerFindOneQueryKey } from '@/shared/api';

const ARTIFACT_LIST_KEY = /^\/artifacts\/(thread|workspace)\/[^/]+$/;

/**
 * Refreshes the artifact and every chat and workspace list showing it. The
 * lists are matched by key because the artifact page knows neither.
 */
export function invalidateArtifactQueries(
  queryClient: QueryClient,
  artifactId: string,
): void {
  void queryClient.invalidateQueries({
    queryKey: getArtifactsControllerFindOneQueryKey(artifactId),
  });
  void queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      typeof queryKey[0] === 'string' && ARTIFACT_LIST_KEY.test(queryKey[0]),
  });
}
