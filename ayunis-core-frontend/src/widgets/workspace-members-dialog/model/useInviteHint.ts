import { useTranslation } from 'react-i18next';
import type { WorkspaceSharingResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { canManageWorkspace } from '@/features/workspaces';
import { joinWithAnd } from '@/widgets/workspace-members-dialog/lib/inviters';

export function useInviteHint(
  sharing: WorkspaceSharingResponseDto | undefined,
): string | null {
  const { t } = useTranslation('workspace-sharing');
  if (!sharing || sharing.viewer.canInvite) return null;
  if (!canManageWorkspace(sharing.viewer.accessLevel)) {
    return t('dialog.noFullAccess');
  }
  const list = [
    t('dialog.inviters.admins'),
    ...(sharing.inviters.managers ? [t('dialog.inviters.managers')] : []),
    ...(sharing.inviters.teamAdmins ? [t('dialog.inviters.teamAdmins')] : []),
  ];
  const mayShareWithOrganization =
    sharing.viewer.canShareWithOrganization &&
    !sharing.isSharedWithOrganization;
  return t(
    mayShareWithOrganization ? 'dialog.noRightPeople' : 'dialog.noRight',
    {
      list: joinWithAnd(list, t('dialog.and')),
    },
  );
}
