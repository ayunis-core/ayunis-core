import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CheckCheck, Inbox } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { cn } from '@ayunis/ui/lib/cn';
import AppLayout from '@/layouts/app-layout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { NotificationDetail } from '@/widgets/notification-detail';
import { NotificationTypeIcon } from '@/features/notifications';
import {
  buildSampleNotifications,
  formatRelative,
  ReadToggleButton,
  useReadToggle,
} from '@/features/home-feed';
import { useSampleDataSetting } from '@/shared/lib/prototype-settings';
import type {
  NotificationResponseDto,
  NotificationType,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useNotifications } from '@/pages/inbox/api/useNotifications';
import { useMarkAllNotificationsRead } from '@/pages/inbox/api/useMarkAllNotificationsRead';
import { InboxFilterBar } from './InboxFilterBar';
import { PrototypeSwitcherToggle } from '@/widgets/prototype-switcher';

interface InboxSplitViewProps {
  page: number;
  type?: NotificationType;
  selectedId?: string;
  selectedModelId?: string;
  isEmbeddingModelEnabled: boolean;
}

const KEY_STEPS: Partial<Record<string, number>> = {
  ArrowDown: 1,
  j: 1,
  ArrowUp: -1,
  k: -1,
};

function useInboxItems(page: number, type?: NotificationType) {
  const [useSampleData] = useSampleDataSetting();
  const { notifications } = useNotifications(page, type);
  const { resolveUnread, setRead } = useReadToggle();
  const items = useMemo(() => {
    const source = useSampleData
      ? buildSampleNotifications().filter((item) => !type || item.type === type)
      : notifications;
    return source.map((item) => {
      const isUnread = resolveUnread(item.id, item.readAt === null);
      return {
        ...item,
        readAt: isUnread ? null : (item.readAt ?? item.createdAt),
      };
    });
  }, [useSampleData, notifications, type, resolveUnread]);
  return { items, isSample: useSampleData, setRead };
}

function InboxRow({
  item,
  isSelected,
  onSelect,
  onToggleRead,
}: Readonly<{
  item: NotificationResponseDto;
  isSelected: boolean;
  onSelect: () => void;
  onToggleRead: () => void;
}>) {
  const isUnread = item.readAt === null;
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onSelect}
        aria-current={isSelected}
        className={cn(
          'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 pr-10 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          isSelected ? 'bg-accent' : 'hover:bg-accent/50',
        )}
      >
        <NotificationTypeIcon
          type={item.type}
          className="mt-0.5 size-4 shrink-0"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={cn(
              'truncate text-sm',
              isUnread
                ? 'font-medium text-foreground'
                : 'text-muted-foreground',
            )}
          >
            {item.headline}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {item.subheadline} · {formatRelative(item.createdAt)}
          </span>
        </span>
      </button>
      <ReadToggleButton
        isUnread={isUnread}
        onToggle={onToggleRead}
        className={cn(
          'absolute top-2 right-2',
          !isUnread &&
            'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
        )}
      />
    </div>
  );
}

function useInboxKeyboard(
  items: NotificationResponseDto[],
  selectedIndex: number,
  select: (id: string) => void,
  toggleSelected: () => void,
) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, [contenteditable="true"]')) return;
      const step = KEY_STEPS[event.key] ?? 0;
      const next = items.at(selectedIndex + step);
      if (step === 0 || !next || selectedIndex + step < 0) return;
      event.preventDefault();
      select(next.id);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [items, selectedIndex, select, toggleSelected]);
}

function MarkAllReadButton({
  disabled,
  onClick,
}: Readonly<{ disabled: boolean; onClick: () => void }>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Alle als gelesen markieren"
          disabled={disabled}
          onClick={onClick}
        >
          <CheckCheck />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Alle als gelesen markieren</TooltipContent>
    </Tooltip>
  );
}

function DetailPane({
  selected,
  onToggleRead,
  selectedModelId,
  isEmbeddingModelEnabled,
}: Readonly<{
  selected: NotificationResponseDto | undefined;
  onToggleRead: () => void;
  selectedModelId?: string;
  isEmbeddingModelEnabled: boolean;
}>) {
  if (!selected) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <Inbox className="size-6" />
        Wählen Sie links eine Meldung aus.
      </div>
    );
  }
  return (
    <div
      key={selected.id}
      className="flex flex-col gap-4 py-2 animate-in fade-in-0 duration-300"
    >
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs font-normal text-muted-foreground"
          onClick={onToggleRead}
        >
          {selected.readAt === null
            ? 'Als gelesen markieren'
            : 'Als ungelesen markieren'}
        </Button>
      </div>
      <NotificationDetail
        notification={selected}
        selectedModelId={selectedModelId}
        isEmbeddingModelEnabled={isEmbeddingModelEnabled}
      />
    </div>
  );
}

export function InboxSplitView({
  page,
  type,
  selectedId,
  selectedModelId,
  isEmbeddingModelEnabled,
}: Readonly<InboxSplitViewProps>) {
  const navigate = useNavigate();
  const { items: allItems, isSample, setRead } = useInboxItems(page, type);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [hiddenTypes, setHiddenTypes] = useState<Set<NotificationType>>(
    () => new Set(),
  );
  const toggleType = (hidden: NotificationType) =>
    setHiddenTypes((current) => {
      const next = new Set(current);
      if (next.has(hidden)) next.delete(hidden);
      else next.add(hidden);
      return next;
    });
  const markAllRead = useMarkAllNotificationsRead();
  const items = allItems.filter(
    (item) =>
      item.type !== 'release_note' &&
      !hiddenTypes.has(item.type) &&
      (!onlyUnread || item.readAt === null || item.id === selectedId),
  );
  const selectedIndex = Math.max(
    items.findIndex((item) => item.id === selectedId),
    0,
  );
  const selected = items.at(selectedIndex);
  const unread = allItems.filter(
    (item) => item.readAt === null && item.type !== 'release_note',
  );

  const select = (id: string) =>
    void navigate({
      to: '/inbox',
      search: (prev) => ({ ...prev, selected: id }),
      replace: true,
    });
  const toggleSelected = () => {
    if (selected) setRead(selected.id, selected.readAt === null);
  };
  useInboxKeyboard(items, selectedIndex, select, toggleSelected);

  const autoReadId = useRef<string | null>(null);
  useEffect(() => {
    if (!selected || autoReadId.current === selected.id) return;
    autoReadId.current = selected.id;
    if (selected.readAt === null) setRead(selected.id, true);
  }, [selected, setRead]);

  function markEverythingRead() {
    unread.forEach((item) => setRead(item.id, true));
    if (!isSample) markAllRead.mutate();
  }

  return (
    <AppLayout>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="content-area-page-header">
          <ContentAreaHeader
            breadcrumbs={[{ label: 'Posteingang' }]}
            badge={
              unread.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                  {unread.length} ungelesen
                </span>
              )
            }
            action={
              <>
                <PrototypeSwitcherToggle />
                <MarkAllReadButton
                  disabled={unread.length === 0 || markAllRead.isPending}
                  onClick={markEverythingRead}
                />
              </>
            }
          />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,360px)_1fr] gap-6 pt-2">
          <aside className="flex min-h-0 flex-col">
            <InboxFilterBar
              hiddenTypes={hiddenTypes}
              onlyUnread={onlyUnread}
              onToggleType={toggleType}
              onShowAll={() => setHiddenTypes(new Set())}
              onOnlyUnread={setOnlyUnread}
            />
            <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
              {items.map((item) => (
                <InboxRow
                  key={item.id}
                  item={item}
                  isSelected={item.id === selected?.id}
                  onSelect={() => select(item.id)}
                  onToggleRead={() => setRead(item.id, item.readAt === null)}
                />
              ))}
              {items.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Hier ist gerade nichts.
                </p>
              )}
            </div>
          </aside>
          <section className="min-h-0 overflow-y-auto border-l border-border/60 pr-2 pl-8">
            <DetailPane
              selected={selected}
              onToggleRead={toggleSelected}
              selectedModelId={selectedModelId}
              isEmbeddingModelEnabled={isEmbeddingModelEnabled}
            />
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
