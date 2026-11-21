import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getArtifactsControllerFindByThreadQueryKey,
  type ArtifactResponseDto,
} from '@/shared/api';
import { useThreadArtifacts } from '@/pages/chat/api/useThreadArtifacts';
import { findLatestArtifactId } from '@/pages/chat/lib/find-latest-artifact-id';

interface UseCreatedArtifactIdParams {
  threadId: string;
  title: string | undefined;
  type: ArtifactResponseDto['type'];
  result: string | undefined;
}

export function useCreatedArtifactId({
  threadId,
  title,
  type,
  result,
}: UseCreatedArtifactIdParams): string | null {
  const queryClient = useQueryClient();
  const { artifacts } = useThreadArtifacts(threadId);
  const artifactId = findLatestArtifactId(artifacts, title, type);
  const hasResult = result !== undefined;
  const isMissing = artifactId === null;

  // The backend has created the artifact by the time the tool result arrives,
  // but the thread's artifact list is otherwise only refreshed after the run.
  useEffect(() => {
    if (!threadId || !hasResult || !isMissing) return;
    void queryClient.invalidateQueries({
      queryKey: getArtifactsControllerFindByThreadQueryKey(threadId),
      exact: true,
    });
  }, [queryClient, threadId, hasResult, isMissing]);

  return artifactId;
}
