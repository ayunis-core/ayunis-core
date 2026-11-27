import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Megaphone } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import { cn } from '@ayunis/ui/lib/cn';
import type {
  NotificationResponseDto,
  NotificationType,
} from '@ayunis/api-client/schemas';
import type { ChatEvents, ChatProductUpdates } from './chat-config';
import { ChatLink } from './chat-link';
import { formatRelativeDate } from './new-chat/format-relative-date';
import { useUnreadNotifications } from './new-chat/use-unread-notifications';
import { useViewportMaxHeight } from './new-chat/use-viewport-max-height';
import { UnreadReleaseNoteList } from './new-chat-release-notes';
import {
  NOTIFICATION_TYPE_APPEARANCE,
  isKnownNotificationType,
} from './notifications/notification-type-appearance';
import { NotificationTypeIcon } from './notifications/NotificationTypeIcon';
import { formatUnreadCount } from './notifications/format-unread-count';
import './new-chat/unread-updates-panel.css';

const PRODUCT_UPDATES_TAB = 'product_updates';

/** One tab per notification type, plus product updates, which are not notifications. */
type UnreadTab = NotificationType | typeof PRODUCT_UPDATES_TAB;

const UNREAD_TABS: UnreadTab[] = [
  ...Object.keys(NOTIFICATION_TYPE_APPEARANCE).filter(isKnownNotificationType),
  PRODUCT_UPDATES_TAB,
];

type UpdateLinks = Pick<ChatEvents, 'onNavigate' | 'hrefFor'>;

interface UnreadUpdatesPanelProps {
  readonly updates: ChatProductUpdates;
  readonly links: UpdateLinks;
  readonly isCollapsed: boolean;
}

function unreadCounts({ notifications, releaseNotes }: ChatProductUpdates) {
  return new Map<string, number>([
    ...notifications.map(({ type, count }): [string, number] => [type, count]),
    [PRODUCT_UPDATES_TAB, releaseNotes ?? 0],
  ]);
}

/** Which tab is open, and which list its body shows while it closes. */
function useUnreadTabs(updates: ChatProductUpdates) {
  const [openType, setOpenType] = useState<UnreadTab | null>(null);
  const [shown, setShown] = useState<{ type: UnreadTab; opening: number }>();
  const rootRef = useRef<HTMLDivElement>(null);
  const counts = unreadCounts(updates);
  const unreadTypes = UNREAD_TABS.filter((type) => (counts.get(type) ?? 0) > 0);
  const activeType =
    openType && unreadTypes.includes(openType) ? openType : null;
  if (openType && !activeType) setOpenType(null);
  useDismiss(rootRef, activeType !== null, setOpenType);

  function toggle(type: UnreadTab) {
    if (activeType === type) {
      setOpenType(null);
      return;
    }
    setShown((current) => ({ type, opening: (current?.opening ?? 0) + 1 }));
    setOpenType(type);
  }
  return { rootRef, counts, unreadTypes, activeType, shown, toggle };
}

/** What is new for the user: a tab per kind with unread items, each opening its newest. */
export function UnreadUpdatesPanel({
  updates,
  links,
  isCollapsed,
}: UnreadUpdatesPanelProps) {
  const tabs = useUnreadTabs(updates);
  const bodyId = useId();
  if (tabs.unreadTypes.length === 0) return null;

  return (
    <div
      className={cn(
        'new-chat-dock-extras relative -mt-4 h-9',
        isCollapsed && 'new-chat-dock-extras--collapsed',
      )}
      aria-hidden={isCollapsed}
      data-testid="new-chat-unread-notifications"
    >
      <div
        ref={tabs.rootRef}
        className="unread-panel absolute inset-x-4 -top-5 z-10"
        data-open={tabs.activeType ? true : undefined}
      >
        <div className="unread-panel__bar flex flex-wrap items-center gap-1 text-xs">
          {tabs.unreadTypes.map((type) => (
            <UnreadTypeChip
              key={type}
              type={type}
              count={tabs.counts.get(type) ?? 0}
              isOpen={tabs.activeType === type}
              controls={bodyId}
              onToggle={() => tabs.toggle(type)}
            />
          ))}
        </div>
        <UnreadPanelBody
          id={bodyId}
          shown={tabs.shown}
          isOpen={tabs.activeType !== null}
          links={links}
        />
      </div>
    </div>
  );
}

function useDismiss(
  rootRef: RefObject<HTMLDivElement | null>,
  isOpen: boolean,
  setOpenType: (type: null) => void,
) {
  useEffect(() => {
    if (!isOpen) return;
    function handlePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpenType(null);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenType(null);
    }
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [rootRef, isOpen, setOpenType]);
}

function chipAppearance(type: UnreadTab) {
  return type === PRODUCT_UPDATES_TAB
    ? { labelClassName: '', countClassName: 'text-brand' }
    : NOTIFICATION_TYPE_APPEARANCE[type];
}

function UnreadCount({
  count,
  className,
}: Readonly<{ count: number; className: string }>) {
  const bumps = useIncreaseCount(count);
  return (
    <span
      key={bumps}
      className={cn(
        'unread-panel__count',
        className,
        bumps > 0 && 'unread-panel__count--bump',
      )}
      data-testid="new-chat-unread-notifications-count"
    >
      {formatUnreadCount(count)}
    </span>
  );
}

function UnreadTypeChip({
  type,
  count,
  isOpen,
  controls,
  onToggle,
}: Readonly<{
  type: UnreadTab;
  count: number;
  isOpen: boolean;
  controls: string;
  onToggle: () => void;
}>) {
  const { t } = useTranslation('chat');
  const { labelClassName, countClassName } = chipAppearance(type);

  return (
    <Button
      type="button"
      variant={isOpen ? 'secondary' : 'ghost'}
      size="xs"
      aria-expanded={isOpen}
      aria-controls={controls}
      onClick={onToggle}
      data-testid="new-chat-unread-notifications-tab"
      data-type={type}
    >
      {type === PRODUCT_UPDATES_TAB ? (
        <Megaphone className="text-muted-foreground" aria-hidden />
      ) : (
        <NotificationTypeIcon type={type} />
      )}
      <span className={labelClassName}>
        {t(`newChat.unreadNotifications.tabs.${type}`)}
      </span>
      <UnreadCount count={count} className={countClassName} />
    </Button>
  );
}

function useIncreaseCount(count: number) {
  const [previous, setPrevious] = useState(count);
  const [increases, setIncreases] = useState(0);
  if (count !== previous) {
    setPrevious(count);
    if (count > previous) setIncreases((current) => current + 1);
  }
  return increases;
}

function UnreadPanelBody({
  id,
  shown,
  isOpen,
  links,
}: Readonly<{
  id: string;
  shown?: { type: UnreadTab; opening: number };
  isOpen: boolean;
  links: UpdateLinks;
}>) {
  const { ref, maxHeight } = useViewportMaxHeight(isOpen);

  return (
    <div id={id} className="unread-panel__body" inert={!isOpen}>
      <div className="min-h-0 overflow-hidden">
        <div ref={ref} className="unread-panel__scroll" style={{ maxHeight }}>
          {shown?.type === PRODUCT_UPDATES_TAB ? (
            <UnreadReleaseNoteList key={shown.opening} links={links} />
          ) : (
            shown && (
              <UnreadNotificationList
                key={shown.opening}
                type={shown.type}
                links={links}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function UnreadNotificationList({
  type,
  links,
}: Readonly<{ type: NotificationType; links: UpdateLinks }>) {
  const { t } = useTranslation('chat');
  const { notifications, isLoading } = useUnreadNotifications(type);

  return (
    <div className="px-1.5 pb-1.5">
      {isLoading ? (
        <Skeleton className="my-1 h-16 w-full" />
      ) : (
        notifications.map((notification, index) => (
          <UnreadNotificationItem
            key={notification.id}
            notification={notification}
            index={index}
            links={links}
          />
        ))
      )}
      <ChatLink
        to={{ kind: 'inbox', type }}
        events={links}
        className="group flex items-center justify-center gap-1 rounded-md py-1.5 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        data-testid="new-chat-unread-notifications-inbox-link"
      >
        {t('newChat.unreadNotifications.viewAll')}
        <ArrowRight
          className="size-3 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </ChatLink>
    </div>
  );
}

function UnreadNotificationItem({
  notification,
  index,
  links,
}: Readonly<{
  notification: NotificationResponseDto;
  index: number;
  links: UpdateLinks;
}>) {
  const { i18n } = useTranslation();
  const details = [
    notification.subheadline,
    formatRelativeDate(notification.createdAt, i18n.language),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Item asChild size="sm">
      <ChatLink
        className="unread-panel__row"
        style={{ animationDelay: `${80 + Math.min(index, 6) * 50}ms` }}
        to={{ kind: 'notification', notificationId: notification.id }}
        events={links}
        data-testid="new-chat-unread-notification"
        data-type={notification.type}
      >
        <ItemMedia variant="icon">
          <NotificationTypeIcon type={notification.type} />
        </ItemMedia>
        <ItemContent className="min-w-0">
          <ItemTitle data-testid="new-chat-unread-notification-headline">
            {notification.headline}
          </ItemTitle>
          <ItemDescription>{details}</ItemDescription>
        </ItemContent>
        <span className="size-2 shrink-0 rounded-full bg-brand" aria-hidden />
      </ChatLink>
    </Item>
  );
}
