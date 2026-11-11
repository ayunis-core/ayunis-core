import {
  artifactsControllerUpdate,
  getArtifactsControllerFindOneQueryKey,
  getArtifactsControllerFindByThreadQueryKey,
  getArtifactsControllerFindByWorkspaceQueryKey,
} from '@/shared/api';
import {
  UpdateArtifactDtoAuthorType,
  type ArtifactResponseDtoType,
  type UpdateArtifactDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { trackProductiveOutcome } from '@/shared/lib/openpanel-outcomes';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UseUpdateArtifactOptions {
  artifactId: string;
  threadId: string;
  workspaceId?: string | null;
  artifactType?: ArtifactResponseDtoType;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function useUpdateArtifact({
  artifactId,
  threadId,
  workspaceId,
  artifactType,
  onSuccess,
  onError,
}: UseUpdateArtifactOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: UpdateArtifactDto) =>
      artifactsControllerUpdate(artifactId, data),
    onSuccess: (_, variables) => {
      if (
        variables.content !== undefined &&
        variables.authorType === UpdateArtifactDtoAuthorType.USER &&
        (artifactType === 'document' || artifactType === 'spreadsheet')
      ) {
        trackProductiveOutcome(queryClient, threadId, {
          outcome_type: 'artifact_edited',
          output_type: artifactType,
        });
      }
      onSuccess?.();
    },
    onError,
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: getArtifactsControllerFindOneQueryKey(artifactId),
      });
      void queryClient.invalidateQueries({
        queryKey: getArtifactsControllerFindByThreadQueryKey(threadId),
      });
      if (workspaceId) {
        void queryClient.invalidateQueries({
          queryKey: getArtifactsControllerFindByWorkspaceQueryKey(workspaceId),
        });
      }
    },
  });

  return {
    updateArtifact: (data: UpdateArtifactDto) => mutation.mutate(data),
    updateArtifactAsync: (data: UpdateArtifactDto) =>
      mutation.mutateAsync(data),
    isUpdating: mutation.isPending,
  };
}
