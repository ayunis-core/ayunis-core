import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
import {
  getWorkspaceSharingControllerGetSharingQueryKey,
  getWorkspacesControllerFindAllQueryKey,
  useWorkspaceMembersControllerInvite,
  useWorkspaceMembersControllerRemove,
  useWorkspaceMembersControllerUpdateAccessLevel,
  useWorkspaceSharingControllerUpdateVisibility,
  useWorkspaceTeamGrantsControllerAdd,
  useWorkspaceTeamGrantsControllerRemove,
  useWorkspaceTeamGrantsControllerResetOverride,
  useWorkspaceTeamGrantsControllerSetOverride,
  useWorkspaceTeamGrantsControllerUpdateAccessLevel,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';

function useSharingMutationFeedback(workspaceId: string) {
  const { t } = useTranslation('workspaces');
  const queryClient = useQueryClient();

  return {
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getWorkspaceSharingControllerGetSharingQueryKey(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: getWorkspacesControllerFindAllQueryKey(),
      });
      showSuccess(t('sharing.toast.success'));
    },
    onError: (error: unknown) => {
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'WORKSPACE_MEMBER_ALREADY_EXISTS':
          case 'WORKSPACE_TEAM_GRANT_ALREADY_EXISTS':
            showError(t('sharing.toast.alreadyExists'));
            break;
          case 'WORKSPACE_MEMBER_NOT_ELIGIBLE':
          case 'WORKSPACE_TEAM_OVERRIDE_USER_NOT_ELIGIBLE':
            showError(t('sharing.toast.notEligible'));
            break;
          case 'WORKSPACE_OWNER_ACCESS_IMMUTABLE':
            showError(t('sharing.toast.ownerImmutable'));
            break;
          case 'WORKSPACE_NOT_FOUND':
          case 'WORKSPACE_MEMBER_NOT_FOUND':
          case 'WORKSPACE_TEAM_GRANT_NOT_FOUND':
          case 'WORKSPACE_TEAM_OVERRIDE_NOT_FOUND':
            showError(t('sharing.toast.notFound'));
            break;
          default:
            showError(t('sharing.toast.error'));
        }
      } catch {
        showError(t('sharing.toast.error'));
      }
    },
  };
}

export function useInviteWorkspaceMember(workspaceId: string) {
  return useWorkspaceMembersControllerInvite({
    mutation: useSharingMutationFeedback(workspaceId),
  });
}

export function useUpdateWorkspaceMemberAccessLevel(workspaceId: string) {
  return useWorkspaceMembersControllerUpdateAccessLevel({
    mutation: useSharingMutationFeedback(workspaceId),
  });
}

export function useRemoveWorkspaceMember(workspaceId: string) {
  return useWorkspaceMembersControllerRemove({
    mutation: useSharingMutationFeedback(workspaceId),
  });
}

export function useUpdateWorkspaceVisibility(workspaceId: string) {
  return useWorkspaceSharingControllerUpdateVisibility({
    mutation: useSharingMutationFeedback(workspaceId),
  });
}

export function useAddWorkspaceTeamGrant(workspaceId: string) {
  return useWorkspaceTeamGrantsControllerAdd({
    mutation: useSharingMutationFeedback(workspaceId),
  });
}

export function useUpdateWorkspaceTeamGrantAccessLevel(workspaceId: string) {
  return useWorkspaceTeamGrantsControllerUpdateAccessLevel({
    mutation: useSharingMutationFeedback(workspaceId),
  });
}

export function useRemoveWorkspaceTeamGrant(workspaceId: string) {
  return useWorkspaceTeamGrantsControllerRemove({
    mutation: useSharingMutationFeedback(workspaceId),
  });
}

export function useSetWorkspaceTeamMemberOverride(workspaceId: string) {
  return useWorkspaceTeamGrantsControllerSetOverride({
    mutation: useSharingMutationFeedback(workspaceId),
  });
}

export function useResetWorkspaceTeamMemberOverride(workspaceId: string) {
  return useWorkspaceTeamGrantsControllerResetOverride({
    mutation: useSharingMutationFeedback(workspaceId),
  });
}
