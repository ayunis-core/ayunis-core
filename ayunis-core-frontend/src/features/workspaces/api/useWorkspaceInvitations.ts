import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  getWorkspaceInvitationsControllerListQueryKey,
  getWorkspacesControllerFindAllQueryKey,
  useWorkspaceInvitationsControllerAccept,
  useWorkspaceInvitationsControllerDecline,
  useWorkspaceInvitationsControllerList,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useWorkspaceInvitations() {
  const { t } = useTranslation('workspaces');
  const queryClient = useQueryClient();
  const query = useWorkspaceInvitationsControllerList();
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: getWorkspaceInvitationsControllerListQueryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: getWorkspacesControllerFindAllQueryKey(),
      }),
    ]);
  };
  const mutationOptions = {
    onSuccess: () => void invalidate(),
    onError: () => toast.error(t('invitations.toast.error')),
  };
  const accept = useWorkspaceInvitationsControllerAccept({
    mutation: {
      ...mutationOptions,
      onSuccess: () => {
        toast.success(t('invitations.toast.accepted'));
        void invalidate();
      },
    },
  });
  const decline = useWorkspaceInvitationsControllerDecline({
    mutation: {
      ...mutationOptions,
      onSuccess: () => {
        toast.success(t('invitations.toast.declined'));
        void invalidate();
      },
    },
  });

  return {
    invitations: query.data ?? [],
    accept: (workspaceId: string) => accept.mutate({ workspaceId }),
    decline: (workspaceId: string) => decline.mutate({ workspaceId }),
    isLoading: query.isLoading,
  };
}
