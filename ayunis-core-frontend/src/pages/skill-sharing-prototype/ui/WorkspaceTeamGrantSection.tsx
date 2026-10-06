import {
  findTeam,
  includedTeamMembers,
  teamPlacementOf,
} from '@/widgets/sharing-prototype/model/access';
import {
  excludeTeamMember,
  setTeamMemberOverride,
} from '@/widgets/sharing-prototype/model/prototype-workspace-shares';
import { WORKSPACE_ACCESS_LABEL } from '@/widgets/sharing-prototype/model/fixtures';
import type {
  MemberAccess,
  Person,
  PrototypeWorkspace,
  WorkspaceTeamGrant,
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

function accessOf(grant: WorkspaceTeamGrant, member: Person): MemberAccess {
  const override = grant.overrides?.[member.id];
  return override && override !== 'excluded' ? override : grant.access;
}

export function WorkspaceTeamGrantSection({
  workspace,
  grant,
  viewer,
  canChange,
}: Readonly<{
  workspace: PrototypeWorkspace;
  grant: WorkspaceTeamGrant;
  viewer: Person;
  canChange: boolean;
}>) {
  const team = findTeam(grant.teamId);
  const included = includedTeamMembers(grant);
  const rows = included.filter(
    (member) => teamPlacementOf(workspace, member.id) === team.id,
  );

  return (
    <>
      <SectionTitle>
        Team {team.name} · {included.length} Personen
      </SectionTitle>
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
                access={accessOf(grant, member)}
                name={member.name}
                canChange={canChange}
                onChange={(next) =>
                  setTeamMemberOverride(workspace.id, team.id, member.id, next)
                }
                onRemove={() =>
                  notifyUnlinked(
                    excludeTeamMember(workspace.id, team.id, member.id),
                    member.name,
                  )
                }
              />
            )
          }
        />
      ))}
      <p className="text-xs text-muted-foreground">
        Wer später ins Team kommt, erhält „
        {WORKSPACE_ACCESS_LABEL[grant.access]}“.
      </p>
    </>
  );
}
