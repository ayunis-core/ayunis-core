import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@ayunis/ui/components/avatar';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import type { WorkspaceSharingUserDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { getInitials } from '@/widgets/workspace-sharing-dialog/lib/getInitials';
import type { WorkspaceAccessLevel } from '@/widgets/workspace-sharing-dialog/model/types';
import { WorkspaceAccessLevelSelect } from './WorkspaceAccessLevelSelect';

interface SharingUserRowProps {
  user: WorkspaceSharingUserDto;
  accessLevel: WorkspaceAccessLevel;
  owner?: boolean;
  pending?: boolean;
  onAccessLevelChange?: (accessLevel: WorkspaceAccessLevel) => void;
  onRemove?: () => void;
}

export function SharingUserRow({
  user,
  accessLevel,
  owner,
  pending,
  onAccessLevelChange,
  onRemove,
}: Readonly<SharingUserRowProps>) {
  const { t } = useTranslation('workspaces');

  return (
    <div
      className="flex items-center gap-3 rounded-md px-2 py-2"
      data-testid={`workspace-sharing-user-${user.id}`}
    >
      <Avatar size="md">
        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{user.name}</span>
          {pending ? (
            <Badge variant="outline">{t('sharing.pending')}</Badge>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      {owner ? (
        <Badge variant="secondary">{t('sharing.owner')}</Badge>
      ) : (
        <div className="flex items-center gap-1">
          <WorkspaceAccessLevelSelect
            value={accessLevel}
            testId={`workspace-sharing-user-access-level-${user.id}`}
            onChange={onAccessLevelChange ?? (() => undefined)}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('sharing.removeMember')}
            onClick={onRemove}
          >
            <Trash2 className="text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
}
