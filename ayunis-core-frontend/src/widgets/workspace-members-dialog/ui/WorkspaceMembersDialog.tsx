import { useTranslation } from 'react-i18next';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import { useAuthenticationControllerMe } from '@/shared/api';
import type { WorkspaceSharingResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  useShareCandidates,
  useWorkspaceSharing,
} from '@/widgets/workspace-members-dialog/api/useWorkspaceSharing';
import {
  useInvite,
  useRemoveMember,
  useSetMemberAccess,
} from '@/widgets/workspace-members-dialog/api/useSharingActions';
import { useInviteHint } from '@/widgets/workspace-members-dialog/model/useInviteHint';
import { useOrganizationSharingConfirm } from '@/widgets/workspace-members-dialog/model/useOrganizationSharingConfirm';
import { useTeamSharingConfirm } from '@/widgets/workspace-members-dialog/model/useTeamSharingConfirm';
import { LoadErrorAlert } from './LoadErrorAlert';
import { MemberPicker, type ShareSelection } from './MemberPicker';
import { ShareList } from './ShareList';
import type { MemberHandlers } from './ShareRow';

interface WorkspaceRef {
  id: string;
  name: string;
}

function useMemberHandlers(workspace: WorkspaceRef): MemberHandlers {
  const { data: me } = useAuthenticationControllerMe();
  const setAccess = useSetMemberAccess(workspace);
  const remove = useRemoveMember(workspace);
  return {
    viewerId: me?.id,
    onSetAccess: (member, accessLevel, teamId) =>
      setAccess.mutate({
        userId: member.userId,
        name: member.name,
        teamId,
        accessLevel,
      }),
    onRemove: (member, teamId) =>
      remove.mutate({ userId: member.userId, name: member.name, teamId }),
  };
}

function InviteArea({
  workspace,
  sharing,
}: Readonly<{
  workspace: WorkspaceRef;
  sharing: WorkspaceSharingResponseDto;
}>) {
  const { t } = useTranslation('workspace-sharing');
  const { viewer, isSharedWithOrganization } = sharing;
  const canOfferOrganization =
    viewer.canShareWithOrganization && !isSharedWithOrganization;
  const enabled = viewer.canInvite || canOfferOrganization;
  const { candidates, isError, refetch } = useShareCandidates(
    workspace.id,
    enabled,
  );
  const invite = useInvite(workspace);
  const organization = useOrganizationSharingConfirm(workspace);
  if (!enabled) return null;
  if (isError && !candidates) {
    return (
      <LoadErrorAlert
        message={t('picker.loadError')}
        testId="share-picker-load-error"
        onRetry={() => void refetch()}
      />
    );
  }
  if (!candidates) {
    return (
      <Skeleton className="h-16 w-full" data-testid="share-picker-loading" />
    );
  }

  function handleInvite(selection: ShareSelection, onInvited: () => void) {
    if (selection.organization) {
      organization.share(onInvited);
      return;
    }
    invite.mutate(
      {
        userIds: selection.userIds,
        teamIds: selection.teamIds,
        accessLevel: selection.accessLevel,
      },
      { onSuccess: onInvited },
    );
  }

  return (
    <MemberPicker
      candidates={candidates}
      isInviting={invite.isPending || organization.isPending}
      emptyText={
        isSharedWithOrganization ? t('picker.everyoneInvited') : undefined
      }
      onInvite={handleInvite}
    />
  );
}

export function WorkspaceMembersDialog({
  workspace,
}: Readonly<{ workspace: WorkspaceRef }>) {
  const { t } = useTranslation('workspace-sharing');
  const { sharing, isLoading, isError, refetch } = useWorkspaceSharing(
    workspace.id,
    true,
  );
  const hint = useInviteHint(sharing);
  const handlers = useMemberHandlers(workspace);
  const organization = useOrganizationSharingConfirm(workspace);
  const teamSharing = useTeamSharingConfirm(workspace);

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {t('dialog.title', { workspace: workspace.name })}
        </DialogTitle>
        <DialogDescription>
          {t('dialog.description')}
          {hint && ` ${hint}`}
        </DialogDescription>
      </DialogHeader>
      {isLoading && <Skeleton className="h-40 w-full" />}
      {isError && !sharing && (
        <LoadErrorAlert
          message={t('dialog.loadError')}
          testId="workspace-members-load-error"
          onRetry={() => void refetch()}
        />
      )}
      {sharing && (
        <>
          <InviteArea workspace={workspace} sharing={sharing} />
          <ShareList
            sharing={sharing}
            handlers={handlers}
            onEndTeamSharing={teamSharing.end}
            onEndOrganizationSharing={
              sharing.viewer.canShareWithOrganization
                ? organization.end
                : undefined
            }
          />
        </>
      )}
    </>
  );
}
