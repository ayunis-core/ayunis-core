import { useTranslation } from 'react-i18next';
import {
  useAuthenticationControllerMe,
  type ArtifactResponseDto,
} from '@/shared/api';
import { useWorkspace } from '@/features/workspaces';
import { showError } from '@/shared/lib/toast';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { resolveArtifactTitle } from '@/widgets/artifact-panel-header';
import { useConvertArtifactToNormal } from '@/widgets/artifact-panel/api/useConvertArtifactToNormal';
import { canManageArtifact } from '@/widgets/artifact-panel/lib/can-manage-artifact';

export type ConvertibleArtifact = Pick<
  ArtifactResponseDto,
  'id' | 'title' | 'piiMasks' | 'ownerType' | 'creatorId'
>;

/**
 * Converts an anonymous artifact to a normal one, so a normal chat can take
 * it, after warning that anonymous chats lose it. Whoever may not convert it
 * gets an error instead of the warning. `workspaceId` is the workspace the
 * artifacts belong to, null for personal ones. The returned function resolves
 * to whether the artifact is normal now.
 */
export function useArtifactConversion(workspaceId: string | null) {
  const { t } = useTranslation('artifacts');
  const { data: user } = useAuthenticationControllerMe();
  const { workspace, isLoading } = useWorkspace(workspaceId);
  const { confirm } = useConfirmation();
  const { mutateAsync } = useConvertArtifactToNormal();

  return (artifact: ConvertibleArtifact): Promise<boolean> => {
    // Until the workspace's permissions are known, the API decides.
    const mayConvert =
      (workspaceId !== null && isLoading) ||
      canManageArtifact(artifact, user?.id, workspace);
    if (!mayConvert) {
      showError(t('conversion.forbidden'));
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      confirm({
        title: t('conversion.confirmTitle'),
        description: t('conversion.confirmDescription', {
          title: resolveArtifactTitle(artifact),
        }),
        confirmText: t('conversion.confirmText'),
        cancelText: t('conversion.cancelText'),
        onConfirm: async () => {
          try {
            await mutateAsync(artifact.id);
            resolve(true);
          } catch {
            // The mutation reported the error.
            resolve(false);
          }
        },
        onCancel: () => resolve(false),
      });
    });
  };
}
