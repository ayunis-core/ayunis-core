import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { WorkspaceGrantLevel } from '@/features/workspaces';
import {
  workspaceSharingControllerEndTeam,
  workspaceSharingControllerInvite,
  workspaceSharingControllerOrganization,
  workspaceSharingControllerRemove,
  workspaceSharingControllerSetAccess,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showInfo, showSuccess } from '@/shared/lib/toast';
import { useRefreshSharing } from './useRefreshSharing';

interface WorkspaceRef {
  id: string;
  name: string;
}

export interface MemberChange {
  userId: string;
  name: string;
  teamId?: string;
}

function useUnlinkNotice() {
  const { t } = useTranslation('workspace-sharing');
  return (unlinkedCount: number, name?: string) => {
    if (unlinkedCount === 0) return;
    showInfo(
      name
        ? t('toasts.unlinkedPerson', { name })
        : t('toasts.unlinkedOrganization'),
    );
  };
}

export function useInvite(workspace: WorkspaceRef) {
  const { t } = useTranslation('workspace-sharing');
  const refresh = useRefreshSharing(workspace.id);
  return useMutation({
    mutationFn: (invite: {
      userIds: string[];
      teamIds: string[];
      accessLevel: WorkspaceGrantLevel;
    }) => workspaceSharingControllerInvite(workspace.id, invite),
    onSuccess: async (_result, { userIds, teamIds }) => {
      const count = userIds.length + teamIds.length;
      showSuccess(
        count === 1
          ? t('toasts.invitedOne', { workspace: workspace.name })
          : t('toasts.invitedMany', { count, workspace: workspace.name }),
      );
      await refresh();
    },
    onError: () => showError(t('toasts.error')),
  });
}

export function useSetMemberAccess(workspace: WorkspaceRef) {
  const { t } = useTranslation('workspace-sharing');
  const refresh = useRefreshSharing(workspace.id);
  return useMutation({
    mutationFn: ({
      userId,
      teamId,
      accessLevel,
    }: MemberChange & { accessLevel: WorkspaceGrantLevel }) =>
      workspaceSharingControllerSetAccess(workspace.id, userId, {
        accessLevel,
        teamId,
      }),
    onSuccess: refresh,
    onError: () => showError(t('toasts.error')),
  });
}

export function useRemoveMember(workspace: WorkspaceRef) {
  const { t } = useTranslation('workspace-sharing');
  const refresh = useRefreshSharing(workspace.id);
  const notifyUnlinked = useUnlinkNotice();
  return useMutation({
    mutationFn: ({ userId, teamId }: MemberChange) =>
      workspaceSharingControllerRemove(workspace.id, userId, { teamId }),
    onSuccess: async ({ unlinkedCount }, { name }) => {
      notifyUnlinked(unlinkedCount, name);
      await refresh();
    },
    onError: () => showError(t('toasts.error')),
  });
}

export function useSetOrganizationSharing(workspace: WorkspaceRef) {
  const { t } = useTranslation('workspace-sharing');
  const refresh = useRefreshSharing(workspace.id);
  const notifyUnlinked = useUnlinkNotice();
  return useMutation({
    mutationFn: (shared: boolean) =>
      workspaceSharingControllerOrganization(workspace.id, { shared }),
    onSuccess: async ({ unlinkedCount }, shared) => {
      if (shared) {
        showSuccess(
          t('toasts.organizationShared', { workspace: workspace.name }),
        );
      }
      notifyUnlinked(unlinkedCount);
      await refresh();
    },
    onError: () => showError(t('toasts.error')),
  });
}

export function useEndTeamSharing(workspace: WorkspaceRef) {
  const { t } = useTranslation('workspace-sharing');
  const refresh = useRefreshSharing(workspace.id);
  const notifyUnlinked = useUnlinkNotice();
  return useMutation({
    mutationFn: (teamId: string) =>
      workspaceSharingControllerEndTeam(workspace.id, teamId),
    onSuccess: async ({ unlinkedCount }) => {
      notifyUnlinked(unlinkedCount);
      await refresh();
    },
    onError: () => showError(t('toasts.error')),
  });
}
