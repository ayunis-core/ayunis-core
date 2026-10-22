import {
  orgIncludedPeople,
  sharesOf,
  teamPlacementOf,
} from '@/widgets/sharing-prototype/model/access';
import { WORKSPACE_ACCESS_LABEL } from '@/widgets/sharing-prototype/model/fixtures';
import {
  excludeOrgMember,
  setOrgMemberAccess,
} from '@/widgets/sharing-prototype/model/prototype-workspace-shares';
import type {
  MemberAccess,
  Person,
  PrototypeWorkspace,
} from '@/widgets/sharing-prototype/model/types';
import { notifyUnlinked } from '@/pages/skill-sharing-prototype/lib/notify-unlinked';
import { useOrgSharing } from '@/pages/skill-sharing-prototype/model/useOrgSharing';
import { GrantedMemberRow, SharingSectionHeader } from './WorkspaceShareParts';

const SORT_RANK: Record<MemberAccess, number> = {
  manage: 1,
  edit: 2,
  use: 3,
};

function orgAccessOf(
  workspace: PrototypeWorkspace,
  person: Person,
): MemberAccess {
  return (
    sharesOf(workspace).members.find((entry) => entry.personId === person.id)
      ?.access ?? 'use'
  );
}

function sortedForList(
  workspace: PrototypeWorkspace,
  people: Person[],
): Person[] {
  const rank = (person: Person) =>
    person.id === workspace.ownerId
      ? 0
      : SORT_RANK[orgAccessOf(workspace, person)];
  return [...people].sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name),
  );
}

export function WorkspaceOrgSection({
  workspace,
  viewer,
  canChange,
  canEndSharing,
}: Readonly<{
  workspace: PrototypeWorkspace;
  viewer: Person;
  canChange: (personId: string) => boolean;
  canEndSharing: boolean;
}>) {
  const orgSharing = useOrgSharing(workspace);
  const included = orgIncludedPeople(workspace);
  const rows = sortedForList(
    workspace,
    included.filter((person) => teamPlacementOf(workspace, person.id) === null),
  );
  if (rows.length === 0) return null;

  return (
    <>
      <SharingSectionHeader onEnd={canEndSharing ? orgSharing.end : undefined}>
        Organisation · {included.length} Personen
      </SharingSectionHeader>
      {rows.map((member) => (
        <GrantedMemberRow
          key={member.id}
          workspace={workspace}
          member={member}
          viewer={viewer}
          access={orgAccessOf(workspace, member)}
          canChange={canChange(member.id)}
          onChange={(next) => setOrgMemberAccess(workspace.id, member.id, next)}
          onRemove={() =>
            notifyUnlinked(
              excludeOrgMember(workspace.id, member.id),
              member.name,
            )
          }
        />
      ))}
      <p className="text-xs text-muted-foreground">
        Wer später in die Organisation kommt, erhält „
        {WORKSPACE_ACCESS_LABEL.use}“.
      </p>
    </>
  );
}
