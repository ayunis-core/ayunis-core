import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@ayunis/ui/components/avatar';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import { Switch } from '@ayunis/ui/components/switch';
import { useWorkspaceSharingData } from '@/widgets/workspace-sharing-dialog/api/useWorkspaceSharingData';
import {
  useAddWorkspaceTeamGrant,
  useInviteWorkspaceMember,
  useRemoveWorkspaceMember,
  useUpdateWorkspaceMemberRole,
  useUpdateWorkspaceVisibility,
} from '@/widgets/workspace-sharing-dialog/api/useWorkspaceSharingMutations';
import type { WorkspaceRole } from '@/widgets/workspace-sharing-dialog/model/types';
import { SharingTeamRow } from './SharingTeamRow';
import { SharingUserRow } from './SharingUserRow';
import { WorkspaceRoleSelect } from './WorkspaceRoleSelect';

interface WorkspaceSharingDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceSharingDialog({
  workspaceId,
  open,
  onOpenChange,
}: Readonly<WorkspaceSharingDialogProps>) {
  const { t } = useTranslation('workspaces');
  const [selection, setSelection] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('use');
  const { sharing, users, teams, isLoading, error } = useWorkspaceSharingData(
    workspaceId,
    open,
  );
  const inviteMember = useInviteWorkspaceMember(workspaceId);
  const addTeam = useAddWorkspaceTeamGrant(workspaceId);
  const updateVisibility = useUpdateWorkspaceVisibility(workspaceId);
  const directIds = useMemo(
    () => new Set(sharing?.members.map(({ user }) => user.id) ?? []),
    [sharing?.members],
  );
  const teamIds = useMemo(
    () => new Set(sharing?.teamGrants.map(({ id }) => id) ?? []),
    [sharing?.teamGrants],
  );
  const availableUsers = users.filter(
    ({ id }) => id !== sharing?.owner.id && !directIds.has(id),
  );
  const availableTeams = teams.filter(({ id }) => !teamIds.has(id));

  const addSelection = () => {
    if (selection.startsWith('team:')) {
      addTeam.mutate({
        workspaceId,
        data: { teamId: selection.slice(5), role },
      });
    } else if (selection.startsWith('user:')) {
      inviteMember.mutate({
        workspaceId,
        data: { userId: selection.slice(5), role },
      });
    }
    setSelection('');
    setRole('use');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg"
        data-testid="workspace-sharing-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t('sharing.title')}</DialogTitle>
          <DialogDescription>{t('sharing.description')}</DialogDescription>
        </DialogHeader>
        {isLoading ? <SharingSkeleton /> : null}
        {error ? (
          <p className="text-sm text-destructive">{t('sharing.loadError')}</p>
        ) : null}
        {sharing ? (
          <>
            <InviteControls
              selection={selection}
              role={role}
              users={availableUsers}
              teams={availableTeams}
              onSelectionChange={setSelection}
              onRoleChange={setRole}
              onInvite={addSelection}
            />
            <SharingRows workspaceId={workspaceId} sharing={sharing} />
            <Item variant="outline" size="sm">
              <ItemMedia variant="icon">
                <Building2 />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{t('sharing.organization.title')}</ItemTitle>
                <ItemDescription>
                  {t('sharing.organization.description')}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Switch
                  checked={sharing.visibility === 'organization'}
                  data-testid="workspace-sharing-organization-toggle"
                  aria-label={t('sharing.organization.title')}
                  onCheckedChange={(checked) =>
                    updateVisibility.mutate({
                      workspaceId,
                      data: {
                        visibility: checked ? 'organization' : 'private',
                      },
                    })
                  }
                />
              </ItemActions>
            </Item>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function InviteControls({
  selection,
  role,
  users,
  teams,
  onSelectionChange,
  onRoleChange,
  onInvite,
}: Readonly<{
  selection: string;
  role: WorkspaceRole;
  users: Array<{ id: string; name: string }>;
  teams: Array<{ id: string; name: string; memberCount?: number }>;
  onSelectionChange: (value: string) => void;
  onRoleChange: (role: WorkspaceRole) => void;
  onInvite: () => void;
}>) {
  const { t } = useTranslation('workspaces');
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={selection} onValueChange={onSelectionChange}>
        <SelectTrigger
          className="min-w-0 flex-1"
          data-testid="workspace-sharing-recipient"
        >
          <SelectValue placeholder={t('sharing.selectRecipient')} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{t('sharing.teams')}</SelectLabel>
            {teams.map((team) => (
              <SelectItem key={team.id} value={`team:${team.id}`}>
                {team.name} ({team.memberCount ?? 0})
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>{t('sharing.people')}</SelectLabel>
            {users.map((user) => (
              <SelectItem key={user.id} value={`user:${user.id}`}>
                {user.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <WorkspaceRoleSelect
        value={role}
        testId="workspace-sharing-role"
        onChange={onRoleChange}
      />
      <Button
        data-testid="workspace-sharing-invite"
        disabled={!selection}
        onClick={onInvite}
      >
        {t('sharing.invite')}
      </Button>
    </div>
  );
}

function SharingRows({
  workspaceId,
  sharing,
}: Readonly<{
  workspaceId: string;
  sharing: NonNullable<ReturnType<typeof useWorkspaceSharingData>['sharing']>;
}>) {
  const { t } = useTranslation('workspaces');
  const updateMember = useUpdateWorkspaceMemberRole(workspaceId);
  const removeMember = useRemoveWorkspaceMember(workspaceId);
  return (
    <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4">
      <SharingUserRow user={sharing.owner} role="full" owner />
      {sharing.visibility === 'organization' ? (
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar className="size-8">
            <AvatarFallback>
              <Building2 className="size-4" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {t('sharing.organization.memberTitle')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('sharing.organization.memberDescription')}
            </p>
          </div>
          <Badge variant="secondary">{t('sharing.roles.use.label')}</Badge>
        </div>
      ) : null}
      {sharing.teamGrants.map((grant) => (
        <SharingTeamRow
          key={grant.id}
          workspaceId={workspaceId}
          grant={grant}
        />
      ))}
      {sharing.members.map((member) => (
        <SharingUserRow
          key={member.user.id}
          user={member.user}
          role={member.role}
          pending={member.status === 'pending'}
          onRoleChange={(role) =>
            updateMember.mutate({
              workspaceId,
              userId: member.user.id,
              data: { role },
            })
          }
          onRemove={() =>
            removeMember.mutate({ workspaceId, userId: member.user.id })
          }
        />
      ))}
    </div>
  );
}

function SharingSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
