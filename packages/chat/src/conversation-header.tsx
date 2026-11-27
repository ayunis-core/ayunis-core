import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@ayunis/ui/components/breadcrumb';
import type {
  ChatFavorites,
  ChatLayout,
  ChatTrailItem,
  ChatViewConfig,
} from './chat-config';
import { ChatLink } from './chat-link';
import type { ChatRunLifecycle } from './run-lifecycle';
import {
  AnonymousBadge,
  ArtifactPanelButton,
  NewChatButton,
  PinButton,
  SidebarToggle,
} from './conversation-header-controls';
import { OriginBadge } from './conversation-origin-badge';
import { ThreadActionsMenu, type HeaderThread } from './thread-actions-menu';

interface ConversationHeaderProps {
  readonly config: ChatViewConfig;
  readonly lifecycle: ChatRunLifecycle;
  readonly thread: HeaderThread;
  readonly title?: string;
}

const HEADER_CLASSES: Record<ChatLayout, { header: string; actions: string }> =
  {
    page: {
      header:
        'flex min-h-9 w-full items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch max-sm:gap-2',
      actions:
        'content-area-header-actions flex min-w-0 shrink-0 flex-wrap items-center gap-2 empty:hidden max-sm:w-full max-sm:justify-end',
    },
    narrow: {
      header: 'flex min-h-9 w-full items-center justify-between gap-2',
      actions:
        'content-area-header-actions flex min-w-0 shrink-0 items-center gap-1 empty:hidden',
    },
  };

/** The open chat's title and trail, its badges and its actions. */
export function ConversationHeader({
  config,
  lifecycle,
  thread,
  title,
}: ConversationHeaderProps) {
  const { t } = useTranslation('chat');
  const classes = HEADER_CLASSES[config.layout];
  const displayTitle = title || t('chat.untitled');
  return (
    <header className={classes.header}>
      <div className="flex min-w-0 flex-1 items-center gap-2 lg:pl-2">
        <SidebarToggle />
        <HeaderTrail
          config={config}
          trail={config.trail?.(thread) ?? []}
          title={displayTitle}
          badge={
            <>
              {thread.isAnonymous && <AnonymousBadge />}
              <OriginBadge origin={thread.origin} events={config.events} />
            </>
          }
        />
      </div>
      <div className={classes.actions}>
        <HeaderActions
          config={config}
          lifecycle={lifecycle}
          thread={thread}
          title={title}
        />
      </div>
    </header>
  );
}

function HeaderActions({
  config,
  lifecycle,
  thread,
  title,
}: ConversationHeaderProps) {
  return (
    <div className="flex items-center gap-1">
      {config.newChat && <NewChatButton onClick={config.newChat.start} />}
      {config.favorites && (
        <HeaderPinButton favorites={config.favorites} threadId={thread.id} />
      )}
      <ThreadActionsMenu
        config={config}
        lifecycle={lifecycle}
        thread={thread}
        title={title}
      />
      {config.artifactPanel && (
        <ArtifactPanelButton
          open={config.artifactPanel.open}
          onToggle={config.artifactPanel.toggle}
        />
      )}
    </div>
  );
}

function HeaderTrail({
  config,
  trail,
  title,
  badge,
}: Readonly<{
  config: ChatViewConfig;
  trail: readonly ChatTrailItem[];
  title: string;
  badge: ReactNode;
}>) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {trail.map((item) => (
          <Fragment key={item.label}>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <ChatLink to={item.target} events={config.events}>
                  {item.label}
                </ChatLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </Fragment>
        ))}
        <BreadcrumbItem>
          <BreadcrumbPage>{title}</BreadcrumbPage>
          {badge}
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function HeaderPinButton({
  favorites,
  threadId,
}: Readonly<{ favorites: ChatFavorites; threadId: string }>) {
  const { t } = useTranslation('common');
  const isPinned = favorites.isFavorite(threadId);
  return (
    <PinButton
      isPinned={isPinned}
      label={isPinned ? t('sidebar.unpinChat') : t('sidebar.pinChat')}
      onToggle={() => favorites.toggle(threadId)}
    />
  );
}
