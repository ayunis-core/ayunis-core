import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import type { WorkspaceGrantLevel } from '@/features/workspaces';
import type { SharingMemberDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { AccessSelect } from './AccessSelect';

export interface MemberHandlers {
  viewerId: string | undefined;
  onSetAccess: (
    member: SharingMemberDto,
    level: WorkspaceGrantLevel,
    teamId?: string,
  ) => void;
  onRemove: (member: SharingMemberDto, teamId?: string) => void;
}

function MemberActions({
  member,
  teamId,
  handlers,
}: Readonly<{
  member: SharingMemberDto;
  teamId?: string;
  handlers: MemberHandlers;
}>) {
  const { t } = useTranslation('workspace-sharing');
  if (member.accessLevel === 'owner' || !member.canChange) {
    return (
      <span className="text-sm text-muted-foreground">
        {t(`levels.${member.accessLevel}`)}
      </span>
    );
  }
  const removeLabel = t('list.remove');
  return (
    <>
      <AccessSelect
        value={member.accessLevel}
        onChange={(level) => handlers.onSetAccess(member, level, teamId)}
        ariaLabel={t('list.levelLabel', { name: member.name })}
        className="w-40"
        testId={`member-level-${member.userId}`}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={removeLabel}
            data-testid={`member-remove-${member.userId}`}
            onClick={() => handlers.onRemove(member, teamId)}
          >
            <X />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{removeLabel}</TooltipContent>
      </Tooltip>
    </>
  );
}

export function ShareRow({
  member,
  teamId,
  handlers,
}: Readonly<{
  member: SharingMemberDto;
  teamId?: string;
  handlers: MemberHandlers;
}>) {
  const { t } = useTranslation('workspace-sharing');
  return (
    <Item
      variant="outline"
      size="sm"
      data-testid={`member-row-${member.userId}`}
    >
      <ItemContent>
        <ItemTitle>
          {member.name}
          {member.userId === handlers.viewerId && (
            <span className="text-muted-foreground">{t('list.you')}</span>
          )}
        </ItemTitle>
        <ItemDescription>
          {member.affiliation ?? t('list.noTeam')}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <MemberActions member={member} teamId={teamId} handlers={handlers} />
      </ItemActions>
    </Item>
  );
}

export function SectionTitle({ children }: Readonly<{ children: string }>) {
  return (
    <h3 className="pt-2 text-xs font-medium text-muted-foreground">
      {children}
    </h3>
  );
}
