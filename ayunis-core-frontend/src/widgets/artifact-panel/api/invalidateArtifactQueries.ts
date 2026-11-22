import type { QueryClient } from '@tanstack/react-query';
import { getArtifactsControllerFindOneQueryKey } from '@/shared/api';

const ARTIFACT_LIST_KEY = /^\/artifacts\/(personal|(thread|workspace)\/[^/]+)$/;

/**
 * Refreshes every chat, workspace and Ablage list of artifacts. The lists are
 * matched by key because the artifact page knows none of them.
 */
export function invalidateArtifactLists(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      typeof queryKey[0] === 'string' && ARTIFACT_LIST_KEY.test(queryKey[0]),
  });
}

/** Refreshes the artifact and every list showing it. */
export function invalidateArtifactQueries(
  queryClient: QueryClient,
  artifactId: string,
): void {
  void queryClient.invalidateQueries({
    queryKey: getArtifactsControllerFindOneQueryKey(artifactId),
  });
  invalidateArtifactLists(queryClient);
}
