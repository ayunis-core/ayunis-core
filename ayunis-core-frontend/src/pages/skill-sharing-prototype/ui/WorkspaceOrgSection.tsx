import { Button } from '@ayunis/ui/components/button';
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
import { affiliationOf } from '@/pages/skill-sharing-prototype/lib/member-options';
import { notifyUnlinked } from '@/pages/skill-sharing-prototype/lib/notify-unlinked';
import { useOrgSharing } from '@/pages/skill-sharing-prototype/model/useOrgSharing';
import {
  AccessControl,
  OwnerLabel,
  PersonTitle,
  SectionTitle,
  ShareRow,
} from './WorkspaceShareParts';

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
  canChange: boolean;
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
      <div className="flex items-start justify-between gap-2">
        <SectionTitle>Organisation · {included.length} Personen</SectionTitle>
        {canEndSharing && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 pt-2 text-xs"
            onClick={orgSharing.end}
          >
            Freigabe beenden
          </Button>
        )}
      </div>
      {rows.map((member) => (
        <ShareRow
          key={member.id}
          title={<PersonTitle member={member} viewer={viewer} />}
          description={affiliationOf(member)}
          actions={
            member.id === workspace.ownerId ? (
              <OwnerLabel />
            ) : (
              <AccessControl
                access={orgAccessOf(workspace, member)}
                name={member.name}
                canChange={canChange}
                onChange={(next) =>
                  setOrgMemberAccess(workspace.id, member.id, next)
                }
                onRemove={() =>
                  notifyUnlinked(
                    excludeOrgMember(workspace.id, member.id),
                    member.name,
                  )
                }
              />
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
