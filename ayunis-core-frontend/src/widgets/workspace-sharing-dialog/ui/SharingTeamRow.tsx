import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, RotateCcw, Trash2, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@ayunis/ui/components/avatar';
import { Button } from '@ayunis/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { cn } from '@ayunis/ui/lib/cn';
import type {
  WorkspaceSharingUserDto,
  WorkspaceSharingOverrideDto,
  WorkspaceSharingTeamGrantDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  useRemoveWorkspaceTeamGrant,
  useResetWorkspaceTeamMemberOverride,
  useSetWorkspaceTeamMemberOverride,
  useUpdateWorkspaceTeamGrantAccessLevel,
} from '@/widgets/workspace-sharing-dialog/api/useWorkspaceSharingMutations';
import { useWorkspaceTeamMembers } from '@/widgets/workspace-sharing-dialog/api/useWorkspaceTeamMembers';
import { getInitials } from '@/widgets/workspace-sharing-dialog/lib/getInitials';
import {
  WORKSPACE_ACCESS_LEVELS,
  type WorkspaceAccessLevel,
} from '@/widgets/workspace-sharing-dialog/model/types';
import { WorkspaceAccessLevelSelect } from './WorkspaceAccessLevelSelect';

interface SharingTeamRowProps {
  workspaceId: string;
  grant: WorkspaceSharingTeamGrantDto;
}

export function SharingTeamRow({
  workspaceId,
  grant,
}: Readonly<SharingTeamRowProps>) {
  const { t } = useTranslation('workspaces');
  const [expanded, setExpanded] = useState(false);
  const { members, isLoading } = useWorkspaceTeamMembers(
    workspaceId,
    grant.id,
    expanded,
  );
  const updateAccessLevel = useUpdateWorkspaceTeamGrantAccessLevel(workspaceId);
  const remove = useRemoveWorkspaceTeamGrant(workspaceId);

  return (
    <div data-testid={`workspace-sharing-team-${grant.id}`}>
      <div className="flex items-center gap-3 rounded-md px-2 py-2">
        <Avatar size="md">
          <AvatarFallback>
            <Users className="size-4" />
          </AvatarFallback>
        </Avatar>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={expanded}
          data-testid={`workspace-sharing-team-expand-${grant.id}`}
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="flex items-center gap-1 text-sm font-medium">
            <span className="truncate">{grant.name}</span>
            <ChevronRight
              className={cn(
                'size-4 transition-transform',
                expanded && 'rotate-90',
              )}
            />
          </span>
          <span className="text-xs text-muted-foreground">
            {t('sharing.teamMembers', { count: grant.memberCount })}
          </span>
        </Button>
        <WorkspaceAccessLevelSelect
          value={grant.accessLevel}
          onChange={(accessLevel) =>
            updateAccessLevel.mutate({
              workspaceId,
              teamId: grant.id,
              data: { accessLevel },
            })
          }
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('sharing.removeTeam')}
          onClick={() => remove.mutate({ workspaceId, teamId: grant.id })}
        >
          <Trash2 className="text-destructive" />
        </Button>
      </div>
      {expanded ? (
        <div className="ml-11 space-y-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              {t('sharing.loading')}
            </p>
          ) : null}
          {members.map((member) => (
            <SharingTeamMemberRow
              key={member.id}
              workspaceId={workspaceId}
              teamId={grant.id}
              teamAccessLevel={grant.accessLevel}
              member={member}
              override={grant.overrides.find(
                ({ user }) => user.id === member.id,
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SharingTeamMemberRow({
  workspaceId,
  teamId,
  teamAccessLevel,
  member,
  override,
}: Readonly<{
  workspaceId: string;
  teamId: string;
  teamAccessLevel: WorkspaceAccessLevel;
  member: WorkspaceSharingUserDto;
  override?: WorkspaceSharingOverrideDto;
}>) {
  const { t } = useTranslation('workspaces');
  const setOverride = useSetWorkspaceTeamMemberOverride(workspaceId);
  const resetOverride = useResetWorkspaceTeamMemberOverride(workspaceId);
  const value = override?.excluded
    ? 'none'
    : (override?.accessLevel ?? teamAccessLevel);

  const update = (next: string) => {
    if (next === teamAccessLevel && override) {
      resetOverride.mutate({ workspaceId, teamId, userId: member.id });
      return;
    }
    setOverride.mutate({
      workspaceId,
      teamId,
      userId: member.id,
      data: {
        accessLevel: next === 'none' ? null : (next as WorkspaceAccessLevel),
      },
    });
  };

  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1">
      <Avatar size="sm">
        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{member.name}</p>
        {override ? (
          <p className="text-xs text-muted-foreground">
            {t('sharing.customAccess')}
          </p>
        ) : null}
      </div>
      <Select value={value} onValueChange={update}>
        <SelectTrigger
          data-testid={`workspace-sharing-team-member-access-level-${member.id}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {WORKSPACE_ACCESS_LEVELS.map((accessLevel) => (
            <SelectItem key={accessLevel} value={accessLevel}>
              {t(`sharing.accessLevels.${accessLevel}.label`)}
            </SelectItem>
          ))}
          <SelectItem value="none">{t('sharing.noAccess')}</SelectItem>
        </SelectContent>
      </Select>
      {override ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('sharing.resetOverride')}
          onClick={() =>
            resetOverride.mutate({ workspaceId, teamId, userId: member.id })
          }
        >
          <RotateCcw />
        </Button>
      ) : null}
    </div>
  );
}
