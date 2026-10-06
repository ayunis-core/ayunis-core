import { Users } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ayunis/ui/components/dialog';
import { showSuccess } from '@/shared/lib/toast';
import { usePrototypeState } from '@/widgets/sharing-prototype/model/prototype-store';
import {
  allTeams,
  sharedPersonIds,
  sharesOf,
  workspaceMemberIds,
} from '@/widgets/sharing-prototype/model/access';
import { addWorkspaceShares } from '@/widgets/sharing-prototype/model/prototype-workspace-shares';
import type {
  Person,
  PrototypeWorkspace,
} from '@/widgets/sharing-prototype/model/types';
import { useOrgSharing } from '@/pages/skill-sharing-prototype/model/useOrgSharing';
import { useWorkspaceSharingRights } from '@/pages/skill-sharing-prototype/model/useWorkspaceSharingRights';
import {
  WorkspaceMemberPicker,
  type ShareSelection,
} from './WorkspaceMemberPicker';
import { WorkspaceShareList } from './WorkspaceShareList';

function successMessage(selection: ShareSelection, workspace: string): string {
  const count = selection.personIds.length + selection.teamIds.length;
  return count === 1
    ? `Eingeladen. „${workspace}“ ist jetzt geteilt.`
    : `${count} Einladungen für „${workspace}“ verschickt.`;
}

function joinGerman(parts: string[]): string {
  if (parts.length < 2) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} und ${parts[parts.length - 1]}`;
}

function useNoInviteText(canManage: boolean): string {
  const { permissions, teamAdminPermissions } = usePrototypeState();
  if (!canManage) {
    return 'Personen einladen und Rechte ändern kann, wer hier Vollzugriff hat.';
  }
  const sharers = [
    'Admins',
    ...(permissions.manager.includes('share_workspaces') ? ['Manager'] : []),
    ...(teamAdminPermissions.includes('team_share_workspaces')
      ? ['Team-Admins für ihr eigenes Team']
      : []),
  ];
  return `Einladen dürfen in Ihrer Organisation nur ${joinGerman(sharers)}.`;
}

function MembersDialogBody({
  workspace,
  person,
}: Readonly<{ workspace: PrototypeWorkspace; person: Person }>) {
  const { isOrgVisible, teamGrants } = sharesOf(workspace);
  const invitedTeamIds = isOrgVisible
    ? allTeams().map((team) => team.id)
    : teamGrants.map((grant) => grant.teamId);
  const { canManage, canInvite, inviteScopeTeamIds, canShareWithOrg } =
    useWorkspaceSharingRights(workspace, person);
  const noInviteText = useNoInviteText(canManage);
  const orgSharing = useOrgSharing(workspace);
  const canOfferOrg = canShareWithOrg && !isOrgVisible;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Mitglieder von „{workspace.name}“</DialogTitle>
        <DialogDescription>
          Alle Mitglieder erhalten Zugriff auf Fähigkeiten, Wissen und erstellte
          Inhalte im Arbeitsbereich. Chats bleiben privat.
          {!canInvite && ` ${noInviteText}`}
        </DialogDescription>
      </DialogHeader>
      {(canInvite || canOfferOrg) && (
        <WorkspaceMemberPicker
          excludedPersonIds={sharedPersonIds(workspace)}
          excludedTeamIds={invitedTeamIds}
          scopeTeamIds={canInvite ? inviteScopeTeamIds : []}
          includeOrg={canOfferOrg}
          emptyText={
            isOrgVisible
              ? 'Alle in Ihrer Organisation sind schon eingeladen.'
              : undefined
          }
          onAdd={(selection) => {
            if (selection.isOrg) {
              orgSharing.share();
              return;
            }
            addWorkspaceShares(workspace.id, selection);
            showSuccess(successMessage(selection, workspace.name));
          }}
        />
      )}
      <WorkspaceShareList
        workspace={workspace}
        viewer={person}
        canChange={canInvite}
        canEndOrgSharing={canShareWithOrg}
      />
    </>
  );
}

export function WorkspaceMembersButton({
  workspace,
  person,
  defaultOpen = false,
}: Readonly<{
  workspace: PrototypeWorkspace;
  person: Person;
  defaultOpen?: boolean;
}>) {
  const memberCount = workspaceMemberIds(workspace).length;

  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users />
          {memberCount} Mitglieder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <MembersDialogBody workspace={workspace} person={person} />
      </DialogContent>
    </Dialog>
  );
}
