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
import {
  useMarketplaceControllerGetSkill,
  useSkillsControllerFindInstalledFromMarketplace,
  type MarketplaceSkillResponseDto,
} from '@/shared/api';

// The card only ever shows and installs the catalogue entry it fetched for
// the model's identifier. Model-supplied name and reason are never used as
// the confirmable identity, so a mismatched identifier cannot be approved
// under a different title.
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
  const query = useMarketplaceControllerGetSkill(identifier, {
    query: { enabled: identifier.length > 0 },
  });
  const skill = query.data;
  const entryUnavailable = identifier.length === 0 || query.isError;

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
          <InstallActions skill={skill} threadId={threadId} />
        </ItemActions>
      )}
    </Item>
  );
}

function InstallActions({
  skill,
  threadId,
}: Readonly<{ skill: MarketplaceSkillResponseDto; threadId?: string }>) {
  const { t } = useTranslation('chat');
  const [installed, setInstalled] = useState(false);
  const mutation = useInstallMarketplaceSkillFromChat({
    threadId,
    onInstalled: () => setInstalled(true),
  });
  // The user may have installed this entry earlier (install page or another
  // chat); offering Install again would create a numbered duplicate. The
  // backend answers this per user, so it is correct however many skills exist.
  const { data: installedEntry } =
    useSkillsControllerFindInstalledFromMarketplace(skill.identifier);
  const installedSkillId = installedEntry?.skillId ?? null;

  if (installedSkillId) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link
          to="/skills/$id"
          params={{ id: installedSkillId }}
          data-testid="marketplace-install-already-installed"
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
        <Button asChild variant="outline" size="sm">
          <Link
            to="/install"
            search={{ skill: skill.identifier }}
            data-testid="marketplace-install-link"
            title={t('chat.tools.install_marketplace_skill.noPermission')}
          >
            {t('chat.tools.install_marketplace_skill.openInstallPage')}
          </Link>
        </Button>
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
