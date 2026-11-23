import { keepPreviousData } from '@tanstack/react-query';
import {
  useArtifactsControllerFindByWorkspace,
  useArtifactsControllerFindPersonal,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { ArtifactScope } from '@/shared/contexts/chat/chatContext';

const PICKER_PAGE_SIZE = 20;

interface UseAttachableArtifactsParams {
  scope: ArtifactScope;
  search?: string;
  enabled: boolean;
}

/**
 * The artifacts a chat of the scope may take, most recently changed first:
 * the user's personal artifacts or the workspace's, never both. An anonymous
 * chat takes only anonymous ones; a normal chat also lists anonymous ones,
 * which are converted to normal ones when picked.
 */
export function useAttachableArtifacts({
  scope,
  search,
  enabled,
}: UseAttachableArtifactsParams) {
  const params = {
    search,
    isAnonymous: scope.isAnonymous ? true : undefined,
    limit: PICKER_PAGE_SIZE,
  };
  const query = { placeholderData: keepPreviousData };
  const personal = useArtifactsControllerFindPersonal(params, {
    query: { ...query, enabled: enabled && scope.workspaceId === null },
  });
  const workspace = useArtifactsControllerFindByWorkspace(
    scope.workspaceId ?? '',
    params,
    { query: { ...query, enabled: enabled && scope.workspaceId !== null } },
  );
  const { data, isLoading, error } =
    scope.workspaceId === null ? personal : workspace;

  return {
    artifacts: data?.data ?? [],
    isLoading,
    error,
  };
}
