import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
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
import {
  NOTIFICATION_TYPE_APPEARANCE,
  NotificationTypeIcon,
  formatUnreadCount,
  isKnownNotificationType,
  useUnreadNotificationCount,
} from '@/features/notifications';
import type {
  NotificationResponseDto,
  NotificationType,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { formatRelativeDate } from '@/shared/lib/format-relative-date';
import { useUnreadNotifications } from '@/pages/new-chat/api/useUnreadNotifications';
import { useViewportMaxHeight } from './useViewportMaxHeight';
import './unread-notifications-panel.css';

interface UnreadNotificationsPanelProps {
  isCollapsed: boolean;
}

export function UnreadNotificationsPanel({
  isCollapsed,
}: Readonly<UnreadNotificationsPanelProps>) {
  const { unreadByType } = useUnreadNotificationCount();
  const [openType, setOpenType] = useState<NotificationType | null>(null);
  const [shownType, setShownType] = useState<NotificationType>();
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyId = useId();
  const counts = new Map<string, number>(
    unreadByType.map(({ type, count }) => [type, count]),
  );
  const unreadTypes = Object.keys(NOTIFICATION_TYPE_APPEARANCE)
    .filter(isKnownNotificationType)
    .filter((type) => (counts.get(type) ?? 0) > 0);
  const activeType =
    openType && unreadTypes.includes(openType) ? openType : null;
  useDismiss(rootRef, activeType !== null, setOpenType);
  if (unreadTypes.length === 0) return null;

  function toggle(type: NotificationType) {
    if (activeType === type) {
      setOpenType(null);
      return;
    }
    setShownType(type);
    setOpenType(type);
  }

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
        ref={rootRef}
        className="unread-panel absolute inset-x-4 -top-5 z-10"
        data-open={activeType ? true : undefined}
      >
        <div className="unread-panel__bar flex items-center gap-1 text-xs">
          {unreadTypes.map((type) => (
            <UnreadTypeChip
              key={type}
              type={type}
              count={counts.get(type) ?? 0}
              isOpen={activeType === type}
              controls={bodyId}
              onToggle={() => toggle(type)}
            />
          ))}
        </div>
        <UnreadPanelBody
          id={bodyId}
          type={shownType}
          isOpen={activeType !== null}
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

function UnreadTypeChip({
  type,
  count,
  isOpen,
  controls,
  onToggle,
}: Readonly<{
  type: NotificationType;
  count: number;
  isOpen: boolean;
  controls: string;
  onToggle: () => void;
}>) {
  const { t } = useTranslation('chat');
  const { labelClassName, countClassName } = NOTIFICATION_TYPE_APPEARANCE[type];
  const bumps = useIncreaseCount(count);

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
      <NotificationTypeIcon type={type} />
      <span className={labelClassName}>
        {t(`newChat.unreadNotifications.tabs.${type}`)}
      </span>
      <span
        key={bumps}
        className={cn(
          'unread-panel__count',
          countClassName,
          bumps > 0 && 'unread-panel__count--bump',
        )}
        data-testid="new-chat-unread-notifications-count"
      >
        {formatUnreadCount(count)}
      </span>
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
  type,
  isOpen,
}: Readonly<{ id: string; type?: NotificationType; isOpen: boolean }>) {
  const { ref, maxHeight } = useViewportMaxHeight(isOpen);

  return (
    <div id={id} className="unread-panel__body" inert={!isOpen}>
      <div className="min-h-0 overflow-hidden">
        <div ref={ref} className="unread-panel__scroll" style={{ maxHeight }}>
          {type && <UnreadNotificationList key={type} type={type} />}
        </div>
      </div>
    </div>
  );
}

function UnreadNotificationList({
  type,
}: Readonly<{ type: NotificationType }>) {
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
          />
        ))
      )}
      <Link
        to="/inbox"
        search={{ type }}
        className="group flex items-center justify-center gap-1 rounded-md py-1.5 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        data-testid="new-chat-unread-notifications-inbox-link"
      >
        {t('newChat.unreadNotifications.viewAll')}
        <ArrowRight
          className="size-3 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </div>
  );
}

function UnreadNotificationItem({
  notification,
  index,
}: Readonly<{ notification: NotificationResponseDto; index: number }>) {
  const { i18n } = useTranslation();
  const details = [
    notification.subheadline,
    formatRelativeDate(notification.createdAt, i18n.language),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Item asChild size="sm">
      <Link
        className="unread-panel__row"
        style={{ animationDelay: `${80 + Math.min(index, 6) * 50}ms` }}
        to="/inbox/$notificationId"
        params={{ notificationId: notification.id }}
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
      </Link>
    </Item>
  );
}
