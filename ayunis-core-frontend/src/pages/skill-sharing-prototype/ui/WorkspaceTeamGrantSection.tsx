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
import { notifyUnlinked } from '@/pages/skill-sharing-prototype/lib/notify-unlinked';
import { useTeamSharing } from '@/pages/skill-sharing-prototype/model/useTeamSharing';
import { GrantedMemberRow, SharingSectionHeader } from './WorkspaceShareParts';

function accessOf(grant: WorkspaceTeamGrant, member: Person): MemberAccess {
  const override = grant.overrides?.[member.id];
  return override && override !== 'excluded' ? override : grant.access;
}

export function WorkspaceTeamGrantSection({
  workspace,
  grant,
  viewer,
  canChange,
  canEnd,
}: Readonly<{
  workspace: PrototypeWorkspace;
  grant: WorkspaceTeamGrant;
  viewer: Person;
  canChange: (personId: string) => boolean;
  canEnd: boolean;
}>) {
  const teamSharing = useTeamSharing(workspace);
  const team = findTeam(grant.teamId);
  const included = includedTeamMembers(grant);
  const rows = included.filter(
    (member) => teamPlacementOf(workspace, member.id) === team.id,
  );

  return (
    <>
      <SharingSectionHeader
        onEnd={canEnd ? () => teamSharing.end(team.id) : undefined}
      >
        Team {team.name} · {included.length} Personen
      </SharingSectionHeader>
      {rows.map((member) => (
        <GrantedMemberRow
          key={member.id}
          workspace={workspace}
          member={member}
          viewer={viewer}
          access={accessOf(grant, member)}
          canChange={canChange(member.id)}
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
      ))}
      <p className="text-xs text-muted-foreground">
        Wer später ins Team kommt, erhält „
        {WORKSPACE_ACCESS_LABEL[grant.access]}“.
      </p>
    </>
  );
}
