import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { Store } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { cn } from '@ayunis/ui/lib/cn';
import { PermissionGate } from '@/features/permissions';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import { useInstallMarketplaceSkillFromChat } from '@/pages/chat/api/useInstallMarketplaceSkillFromChat';
import { useInstalledMarketplaceSkill } from '@/pages/chat/api/useInstalledMarketplaceSkill';
import { useMarketplaceSkillEntry } from '@/pages/chat/api/useMarketplaceSkillEntry';
import type { MarketplaceSkillResponseDto } from '@/shared/api';

// Model-supplied name and reason are never rendered: only the fetched
// catalogue entry is, so a mismatched identifier cannot be approved under a
// different title.
export default function InstallMarketplaceSkillWidget({
  content,
  isStreaming = false,
  threadId,
}: Readonly<{
  content: ToolUseMessageContent;
  isStreaming?: boolean;
  threadId?: string;
}>) {
  const { t } = useTranslation('chat');
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming even if typed as required
  const params = (content.params || {}) as { identifier?: string };
  const identifier = params.identifier ?? '';
  const { skill, isError } = useMarketplaceSkillEntry(identifier);
  // Started alongside the catalogue fetch, while the run may still stream, so
  // the answer is usually in before actions render. Offering Install before
  // it arrives would create a numbered duplicate on click.
  const { installedSkillId, isLoading: installedLookupPending } =
    useInstalledMarketplaceSkill(identifier);
  const entryUnavailable = identifier.length === 0 || isError;

  return (
    <Item
      variant="outline"
      className={cn('my-2 w-full', isStreaming && 'animate-pulse')}
      data-testid="marketplace-install-widget"
    >
      <ItemMedia variant="icon">
        <Store />
      </ItemMedia>
      <ItemContent>
        <ItemDescription>
          {t('chat.tools.install_marketplace_skill.title')}
        </ItemDescription>
        {skill ? (
          <>
            <ItemTitle>{skill.name}</ItemTitle>
            <ItemDescription>{skill.shortDescription}</ItemDescription>
          </>
        ) : (
          <ItemDescription data-testid="marketplace-install-state">
            {entryUnavailable
              ? t('chat.tools.install_marketplace_skill.entryUnavailable')
              : t('chat.tools.install_marketplace_skill.loading')}
          </ItemDescription>
        )}
      </ItemContent>
      {skill && !isStreaming && (
        <ItemActions>
          {installedLookupPending ? (
            <ItemDescription data-testid="marketplace-install-state">
              {t('chat.tools.install_marketplace_skill.loading')}
            </ItemDescription>
          ) : (
            <InstallActions
              skill={skill}
              installedSkillId={installedSkillId}
              threadId={threadId}
            />
          )}
        </ItemActions>
      )}
    </Item>
  );
}

function InstallActions({
  skill,
  installedSkillId,
  threadId,
}: Readonly<{
  skill: MarketplaceSkillResponseDto;
  installedSkillId: string | null;
  threadId?: string;
}>) {
  const { t } = useTranslation('chat');
  const [installed, setInstalled] = useState(false);
  const mutation = useInstallMarketplaceSkillFromChat({
    threadId,
    onInstalled: () => setInstalled(true),
  });

  if (installedSkillId) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link
          to="/skills/$id"
          params={{ id: installedSkillId }}
          data-testid="marketplace-install-open-skill-link"
          title={t('chat.tools.install_marketplace_skill.openSkill')}
        >
          {t('chat.tools.install_marketplace_skill.alreadyInstalled')}
        </Link>
      </Button>
    );
  }

  return (
    <PermissionGate
      permission="manage_skills"
      fallback={
        <ItemDescription data-testid="marketplace-install-no-permission">
          {t('chat.tools.install_marketplace_skill.noPermission')}
        </ItemDescription>
      }
    >
      {installed ? (
        <Badge data-testid="marketplace-install-done">
          {t('chat.tools.install_marketplace_skill.installed')}
        </Badge>
      ) : (
        <Button
          size="sm"
          onClick={() => mutation.mutate({ identifier: skill.identifier })}
          disabled={mutation.isPending}
          data-testid="marketplace-install-button"
        >
          {mutation.isPending
            ? t('chat.tools.install_marketplace_skill.installing')
            : t('chat.tools.install_marketplace_skill.install')}
        </Button>
      )}
    </PermissionGate>
  );
}
