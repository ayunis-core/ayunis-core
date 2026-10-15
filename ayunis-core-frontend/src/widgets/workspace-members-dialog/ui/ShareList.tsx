import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { ItemGroup } from '@ayunis/ui/components/item';
import type {
  SharingTeamDto,
  WorkspaceSharingResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { SectionTitle, ShareRow, type MemberHandlers } from './ShareRow';

function PeopleSection({
  sharing,
  handlers,
}: Readonly<{
  sharing: WorkspaceSharingResponseDto;
  handlers: MemberHandlers;
}>) {
  const { t } = useTranslation('workspace-sharing');
  const ownerInTeam = sharing.teams.some(({ members }) =>
    members.some(({ isOwner }) => isOwner),
  );
  const rows = [...(ownerInTeam ? [] : [sharing.owner]), ...sharing.people];
  if (sharing.isSharedWithOrganization || rows.length === 0) return null;
  return (
    <>
      <SectionTitle>{t('list.people')}</SectionTitle>
      {rows.map((member) => (
        <ShareRow key={member.userId} member={member} handlers={handlers} />
      ))}
    </>
  );
}

function TeamSection({
  team,
  handlers,
  onEndSharing,
}: Readonly<{
  team: SharingTeamDto;
  handlers: MemberHandlers;
  onEndSharing?: (team: SharingTeamDto) => void;
}>) {
  const { t } = useTranslation('workspace-sharing');
  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <SectionTitle>
          {t('list.team', { name: team.name, count: team.memberCount })}
        </SectionTitle>
        {team.canEnd && onEndSharing && (
          <Button
            variant="link"
            size="xs"
            data-testid={`end-team-sharing-${team.teamId}`}
            onClick={() => onEndSharing(team)}
          >
            {t('list.endSharing')}
          </Button>
        )}
      </div>
      {team.members.map((member) => (
        <ShareRow
          key={member.userId}
          member={member}
          teamId={team.teamId}
          handlers={handlers}
        />
      ))}
      <p className="text-xs text-muted-foreground">
        {t('list.teamFootnote', {
          level: t(`levels.${team.accessLevel}`),
        })}
      </p>
    </>
  );
}

function OrganizationSection({
  sharing,
  handlers,
  onEndSharing,
}: Readonly<{
  sharing: WorkspaceSharingResponseDto;
  handlers: MemberHandlers;
  onEndSharing?: () => void;
}>) {
  const { t } = useTranslation('workspace-sharing');
  const { organization } = sharing;
  if (!organization) return null;
  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <SectionTitle>
          {t('list.organization', { count: organization.memberCount })}
        </SectionTitle>
        {onEndSharing && (
          <Button
            variant="link"
            size="xs"
            data-testid="end-organization-sharing"
            onClick={onEndSharing}
          >
            {t('list.endSharing')}
          </Button>
        )}
      </div>
      {organization.members.map((member) => (
        <ShareRow key={member.userId} member={member} handlers={handlers} />
      ))}
      <p className="text-xs text-muted-foreground">
        {t('list.organizationFootnote')}
      </p>
    </>
  );
}

export function ShareList({
  sharing,
  handlers,
  onEndTeamSharing,
  onEndOrganizationSharing,
}: Readonly<{
  sharing: WorkspaceSharingResponseDto;
  handlers: MemberHandlers;
  onEndTeamSharing?: (team: SharingTeamDto) => void;
  onEndOrganizationSharing?: () => void;
}>) {
  return (
    <ItemGroup
      className="max-h-80 gap-2 overflow-y-auto p-1"
      data-testid="share-list"
    >
      <PeopleSection sharing={sharing} handlers={handlers} />
      {sharing.teams.map((team) => (
        <TeamSection
          key={team.teamId}
          team={team}
          handlers={handlers}
          onEndSharing={onEndTeamSharing}
        />
      ))}
      <OrganizationSection
        sharing={sharing}
        handlers={handlers}
        onEndSharing={onEndOrganizationSharing}
      />
    </ItemGroup>
  );
}
