import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getArtifactsControllerFindByThreadQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import {
  artifactAttachErrorKey,
  attachArtifacts,
} from '@/shared/lib/artifact-attachment';
import { showError } from '@/shared/lib/toast';

/**
 * Links artifacts picked in the composer to the chat. Resolves to false,
 * after telling the user, when one of them could not be linked.
 */
export function useAttachArtifacts(threadId: string) {
  const { t } = useTranslation('chat');
  const queryClient = useQueryClient();

  return async (artifactIds: string[]): Promise<boolean> => {
    const attached = await attachArtifacts(
      threadId,
      artifactIds,
      () => false,
      (error) => showError(t(artifactAttachErrorKey(error))),
    );
    void queryClient.invalidateQueries({
      queryKey: getArtifactsControllerFindByThreadQueryKey(threadId),
    });
    return attached;
  };
}
