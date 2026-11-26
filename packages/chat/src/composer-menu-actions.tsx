import { Badge } from '@ayunis/ui/components/badge';
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { Brain, Check, Loader2, Plug, Plus, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

export type ComposerMenuStatus = 'loading' | 'error' | 'ready';

export function SkillsMenuAction({
  items,
  status,
  selectedId,
  onSelect,
}: Readonly<{
  items: readonly { id: string; name: string }[];
  status: ComposerMenuStatus;
  selectedId?: string;
  onSelect: (id: string, name: string) => void;
}>) {
  const { t } = useTranslation('common');
  return (
    <MenuSub
      trigger={
        <>
          <Sparkles className="h-4 w-4" />
          {t('chatInput.addSkill')}
        </>
      }
    >
      <MenuStatus
        status={status}
        empty={!items.length}
        emptyKey="chatInput.skillsEmptyState"
        errorKey="chatInput.skillsLoadError"
      />
      {status === 'ready' &&
        items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            data-testid={`chat-input-skill-${item.id}`}
            onClick={() => onSelect(item.id, item.name)}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate" title={item.name}>
              {item.name}
            </span>
            {selectedId === item.id && <Check className="h-4 w-4 shrink-0" />}
          </DropdownMenuItem>
        ))}
    </MenuSub>
  );
}

export function KnowledgeBasesMenuAction({
  items,
  status,
  attachedIds,
  onSelect,
  onCreate,
}: Readonly<{
  items: readonly { id: string; name: string; isShared?: boolean }[];
  status: ComposerMenuStatus;
  attachedIds: readonly string[];
  onSelect: (item: { id: string; name: string }) => void;
  onCreate: () => void;
}>) {
  const { t } = useTranslation('common');
  const available = items.filter(({ id }) => !attachedIds.includes(id));
  const emptyKey = items.length
    ? 'chatInput.knowledgeBasesAllAttached'
    : 'chatInput.knowledgeBasesEmptyState';
  return (
    <MenuSub
      trigger={
        <>
          <Brain className="h-4 w-4" />
          {t('chatInput.addKnowledgeBase')}
        </>
      }
    >
      <MenuStatus
        status={status}
        empty={!available.length}
        emptyKey={emptyKey}
        errorKey="chatInput.knowledgeBasesLoadError"
      />
      {status === 'ready' &&
        available.map((item) => (
          <DropdownMenuItem key={item.id} onClick={() => onSelect(item)}>
            {item.name}
            {item.isShared && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {t('chatInput.shared')}
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      <DropdownMenuItem onClick={onCreate}>
        <Plus /> {t('chatInput.createKnowledgeBase')}
      </DropdownMenuItem>
    </MenuSub>
  );
}

export function IntegrationsMenuAction({
  items,
  status,
  attachedIds,
  onSelect,
}: Readonly<{
  items: readonly {
    id: string;
    name: string;
    logoUrl?: string | null;
    userAuthorized?: boolean;
  }[];
  status: ComposerMenuStatus;
  attachedIds: readonly string[];
  onSelect: (item: {
    id: string;
    name: string;
    logoUrl?: string | null;
  }) => void;
}>) {
  const { t } = useTranslation('common');
  const available = items.filter(({ id }) => !attachedIds.includes(id));
  const emptyKey = items.length
    ? 'chatInput.integrationsAllAttached'
    : 'chatInput.integrationsEmptyState';
  return (
    <MenuSub
      trigger={
        <>
          <Plug className="h-4 w-4" />
          {t('chatInput.addIntegration')}
        </>
      }
    >
      <MenuStatus
        status={status}
        empty={!available.length}
        emptyKey={emptyKey}
        errorKey="chatInput.integrationsLoadError"
      />
      {status === 'ready' &&
        available.map((item) => (
          <IntegrationItem key={item.id} item={item} onSelect={onSelect} />
        ))}
    </MenuSub>
  );
}

function IntegrationItem({
  item,
  onSelect,
}: Readonly<{
  item: {
    id: string;
    name: string;
    logoUrl?: string | null;
    userAuthorized?: boolean;
  };
  onSelect: (item: {
    id: string;
    name: string;
    logoUrl?: string | null;
  }) => void;
}>) {
  const { t } = useTranslation('common');
  const disabled = item.userAuthorized === false;
  const menuItem = (
    <DropdownMenuItem disabled={disabled} onClick={() => onSelect(item)}>
      {item.name}
    </DropdownMenuItem>
  );
  if (!disabled) return menuItem;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{menuItem}</div>
        </TooltipTrigger>
        <TooltipContent>
          {t('chatInput.integrationNotAuthorized')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function MenuSub({
  trigger,
  children,
}: Readonly<{ trigger: ReactNode; children: ReactNode }>) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>{trigger}</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>{children}</DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  );
}

function MenuStatus({
  status,
  empty,
  emptyKey,
  errorKey,
}: Readonly<{
  status: ComposerMenuStatus;
  empty: boolean;
  emptyKey: string;
  errorKey: string;
}>) {
  const { t } = useTranslation('common');
  if (status === 'loading')
    return (
      <DropdownMenuItem disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('common.loading')}
      </DropdownMenuItem>
    );
  if (status === 'error')
    return (
      <DropdownMenuItem disabled className="text-destructive">
        {t(errorKey)}
      </DropdownMenuItem>
    );
  if (empty) return <DropdownMenuItem disabled>{t(emptyKey)}</DropdownMenuItem>;
  return null;
}
