import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { Workspace } from '@/features/workspaces';
import {
  getWorkspaceOwnershipControllerCandidatesQueryKey,
  getWorkspaceSharingControllerCandidatesQueryKey,
  getWorkspaceSharingControllerSharingQueryKey,
  getWorkspacesControllerFindAllQueryKey,
  getWorkspacesControllerFindOneQueryKey,
  useWorkspaceOwnershipControllerTransferOwnership,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { OwnershipCandidateDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

const ERROR_TOASTS: Record<string, string> = {
  WORKSPACE_TRANSFER_TARGET_NOT_ELIGIBLE: 'toast.transferNotEligible',
  WORKSPACE_OWNER_ONLY: 'toast.transferOwnerOnly',
  WORKSPACE_NOT_FOUND: 'toast.notFound',
};

function errorToastKey(error: unknown): string {
  try {
    return ERROR_TOASTS[extractErrorData(error).code] ?? 'toast.transferError';
  } catch {
    return 'toast.transferError';
  }
}

export function useTransferWorkspaceOwnership(
  workspace: Pick<Workspace, 'id' | 'name'>,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('workspaces');
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useWorkspaceOwnershipControllerTransferOwnership({
    mutation: {
      onError: (error: unknown) => showError(t(errorToastKey(error))),
      onSettled: async () => {
        await Promise.all(
          [
            getWorkspacesControllerFindOneQueryKey(workspace.id),
            getWorkspacesControllerFindAllQueryKey(),
            getWorkspaceSharingControllerSharingQueryKey(workspace.id),
            getWorkspaceSharingControllerCandidatesQueryKey(workspace.id),
            getWorkspaceOwnershipControllerCandidatesQueryKey(workspace.id),
          ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        );
        await router.invalidate();
      },
    },
  });

  function transfer(person: OwnershipCandidateDto) {
    mutation.mutate(
      { id: workspace.id, data: { userId: person.id } },
      {
        onSuccess: () => {
          showSuccess(
            t('toast.transferSuccess', {
              workspace: workspace.name,
              name: person.name,
            }),
          );
          onSuccess?.();
        },
      },
    );
  }

  return { transfer, isTransferring: mutation.isPending };
}
