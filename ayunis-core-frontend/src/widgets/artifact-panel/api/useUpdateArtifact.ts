import { artifactsControllerUpdate } from '@/shared/api';
import type {
  ArtifactResponseDtoType,
  UpdateArtifactDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { trackProductiveOutcome } from '@/shared/lib/openpanel-outcomes';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateArtifactQueries } from './invalidateArtifactQueries';

interface UseUpdateArtifactOptions {
  artifactId: string;
  /** The chat the artifact is edited in; outcomes are only tracked there. */
  threadId?: string;
  artifactType?: ArtifactResponseDtoType;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function useUpdateArtifact({
  artifactId,
  threadId,
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
        threadId &&
        variables.content !== undefined &&
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
    onSettled: () => invalidateArtifactQueries(queryClient, artifactId),
  });

  return {
    updateArtifact: (data: UpdateArtifactDto) => mutation.mutate(data),
    updateArtifactAsync: (data: UpdateArtifactDto) =>
      mutation.mutateAsync(data),
    isUpdating: mutation.isPending,
  };
}
