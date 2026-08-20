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
  useUpdateWorkspaceTeamGrantRole,
} from '@/widgets/workspace-sharing-dialog/api/useWorkspaceSharingMutations';
import { useWorkspaceTeamMembers } from '@/widgets/workspace-sharing-dialog/api/useWorkspaceTeamMembers';
import { getInitials } from '@/widgets/workspace-sharing-dialog/lib/getInitials';
import {
  WORKSPACE_ROLES,
  type WorkspaceRole,
} from '@/widgets/workspace-sharing-dialog/model/types';
import { WorkspaceRoleSelect } from './WorkspaceRoleSelect';

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
  const updateRole = useUpdateWorkspaceTeamGrantRole(workspaceId);
  const remove = useRemoveWorkspaceTeamGrant(workspaceId);

  return (
    <div data-testid={`workspace-sharing-team-${grant.id}`}>
      <div className="flex items-center gap-3 rounded-md px-2 py-2">
        <Avatar className="size-8">
          <AvatarFallback>
            <Users className="size-4" />
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
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
        </button>
        <WorkspaceRoleSelect
          value={grant.role}
          onChange={(role) =>
            updateRole.mutate({ workspaceId, teamId: grant.id, data: { role } })
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
              teamRole={grant.role}
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
  teamRole,
  member,
  override,
}: Readonly<{
  workspaceId: string;
  teamId: string;
  teamRole: WorkspaceRole;
  member: WorkspaceSharingUserDto;
  override?: WorkspaceSharingOverrideDto;
}>) {
  const { t } = useTranslation('workspaces');
  const setOverride = useSetWorkspaceTeamMemberOverride(workspaceId);
  const resetOverride = useResetWorkspaceTeamMemberOverride(workspaceId);
  const value = override?.excluded ? 'none' : (override?.role ?? teamRole);

  const update = (next: string) => {
    if (next === teamRole && override) {
      resetOverride.mutate({ workspaceId, teamId, userId: member.id });
      return;
    }
    setOverride.mutate({
      workspaceId,
      teamId,
      userId: member.id,
      data: { role: next === 'none' ? null : (next as WorkspaceRole) },
    });
  };

  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1">
      <Avatar className="size-6">
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
          className="w-40"
          data-testid={`workspace-sharing-team-member-role-${member.id}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {WORKSPACE_ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {t(`sharing.roles.${role}.label`)}
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
