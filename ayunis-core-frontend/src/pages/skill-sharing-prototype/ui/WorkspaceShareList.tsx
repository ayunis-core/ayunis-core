import { ItemGroup } from '@ayunis/ui/components/item';
import {
  findPerson,
  sharesOf,
  teamPlacementOf,
} from '@/widgets/sharing-prototype/model/access';
import {
  removeWorkspaceMember,
  setMemberAccess,
} from '@/widgets/sharing-prototype/model/prototype-workspace-shares';
import type {
  Person,
  PrototypeWorkspace,
} from '@/widgets/sharing-prototype/model/types';
import { affiliationOf } from '@/pages/skill-sharing-prototype/lib/member-options';
import { notifyUnlinked } from '@/pages/skill-sharing-prototype/lib/notify-unlinked';
import {
  AccessControl,
  OwnerLabel,
  PersonTitle,
  SectionTitle,
  ShareRow,
} from './WorkspaceShareParts';
import { WorkspaceOrgSection } from './WorkspaceOrgSection';
import { WorkspaceTeamGrantSection } from './WorkspaceTeamGrantSection';

function PeopleSection({
  workspace,
  viewer,
  canChange,
}: Readonly<{
  workspace: PrototypeWorkspace;
  viewer: Person;
  canChange: boolean;
}>) {
  const owner = findPerson(workspace.ownerId);
  const showOwner = teamPlacementOf(workspace, owner.id) === null;
  const { members, isOrgVisible } = sharesOf(workspace);
  if (isOrgVisible || (!showOwner && members.length === 0)) return null;
  return (
    <>
      <SectionTitle>Personen</SectionTitle>
      {showOwner && (
        <ShareRow
          title={<PersonTitle member={owner} viewer={viewer} />}
          description={affiliationOf(owner)}
          actions={<OwnerLabel />}
        />
      )}
      {members.map(({ personId, access }) => {
        const member = findPerson(personId);
        return (
          <ShareRow
            key={personId}
            title={<PersonTitle member={member} viewer={viewer} />}
            description={affiliationOf(member)}
            actions={
              <AccessControl
                access={access}
                name={member.name}
                canChange={canChange}
                onChange={(next) =>
                  setMemberAccess(workspace.id, personId, next)
                }
                onRemove={() =>
                  notifyUnlinked(
                    removeWorkspaceMember(workspace.id, personId),
                    member.name,
                  )
                }
              />
            }
          />
        );
      })}
    </>
  );
}

export function WorkspaceShareList({
  workspace,
  viewer,
  canChange,
  canEndOrgSharing,
}: Readonly<{
  workspace: PrototypeWorkspace;
  viewer: Person;
  canChange: boolean;
  canEndOrgSharing: boolean;
}>) {
  return (
    <ItemGroup className="max-h-80 gap-2 overflow-y-auto p-1">
      <PeopleSection
        workspace={workspace}
        viewer={viewer}
        canChange={canChange}
      />
      {sharesOf(workspace).teamGrants.map((grant) => (
        <WorkspaceTeamGrantSection
          key={grant.teamId}
          workspace={workspace}
          grant={grant}
          viewer={viewer}
          canChange={canChange}
        />
      ))}
      <WorkspaceOrgSection
        workspace={workspace}
        viewer={viewer}
        canChange={canChange}
        canEndSharing={canEndOrgSharing}
      />
    </ItemGroup>
  );
}
