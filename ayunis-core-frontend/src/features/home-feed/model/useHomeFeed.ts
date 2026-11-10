import { useMemo } from 'react';
import {
  useNotificationsControllerFindAll,
  useRoutinesControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import type {
  NotificationResponseDto,
  RoutineResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useIsFeatureEnabled } from '@/features/feature-toggles';
import {
  useReadOverrides,
  useSampleArrivals,
  useSampleCategories,
  useSampleHasRoutines,
  useSampleStatus,
} from '@/shared/lib/prototype-settings';
import { buildScenarioFeed } from './sample-scenarios';
import type { FeedItem, FeedRoutine, HomeFeed } from './types';

export type {
  FeedKind,
  FeedItem,
  FeedRoutine,
  FeedTask,
  HomeFeed,
  Detection,
} from './types';

const HOUR = 60 * 60 * 1000;

function toFeedItem(notification: NotificationResponseDto): FeedItem {
  return {
    id: notification.id,
    kind: notification.type === 'release_note' ? 'news' : notification.type,
    title: notification.headline,
    source:
      notification.subheadline ??
      (notification.type === 'release_note' ? 'Neuigkeiten' : 'Routine'),
    createdAt: notification.createdAt,
    isUnread: notification.readAt === null,
    notificationId: notification.id,
  };
}

function toFeedRoutine(routine: RoutineResponseDto): FeedRoutine {
  return {
    id: routine.id,
    name: routine.name,
    dailyTime: routine.dailyTime,
    nextRunAt: routine.nextRunAt,
    hasFailed: routine.lastRunStatus === 'failed',
  };
}

function runningNames(routines: RoutineResponseDto[]): string[] {
  return routines
    .filter(
      (routine) =>
        routine.lastRunStatus === 'running' ||
        routine.lastRunStatus === 'queued',
    )
    .map((routine) => routine.name);
}

function applyReadState(
  feed: HomeFeed,
  resolveUnread: (id: string, fallback: boolean) => boolean,
): HomeFeed {
  const apply = (items: FeedItem[]) =>
    items.map((item) => ({
      ...item,
      isUnread: resolveUnread(item.id, item.isUnread),
    }));
  const routineResults = apply(feed.routineResults);
  const news = apply(feed.news);
  return {
    ...feed,
    routineResults,
    news,
    unreadRoutineCount: routineResults.filter((item) => item.isUnread).length,
    unreadNewsCount: news.filter((item) => item.isUnread).length,
  };
}

export function useHomeFeed(useSampleData: boolean): HomeFeed {
  const { resolveUnread } = useReadOverrides();
  const baseFeed = useBaseFeed(useSampleData);
  return useMemo(
    () => applyReadState(baseFeed, resolveUnread),
    [baseFeed, resolveUnread],
  );
}

function useBaseFeed(useSampleData: boolean): HomeFeed {
  const routinesEnabled = useIsFeatureEnabled('routinesEnabled');
  const enabled = routinesEnabled && !useSampleData;
  const notificationsQuery = useNotificationsControllerFindAll(
    { limit: 8, offset: 0 },
    { query: { enabled } },
  );
  const routinesQuery = useRoutinesControllerFindAll({ query: { enabled } });
  const [categories] = useSampleCategories();
  const [status] = useSampleStatus();
  const [hasRoutines] = useSampleHasRoutines();
  const [arrivals] = useSampleArrivals();

  return useMemo(() => {
    if (useSampleData) {
      return buildScenarioFeed({ categories, status, hasRoutines }, arrivals);
    }
    const items = (notificationsQuery.data?.data ?? []).map(toFeedItem);
    const routineResults = items.filter((item) => item.kind !== 'news');
    const news = items.filter((item) => item.kind === 'news');
    const routines = (routinesQuery.data ?? []).map(toFeedRoutine);
    return {
      routineResults,
      news,
      routines,
      tasks: [],
      unreadRoutineCount: routineResults.filter((item) => item.isUnread).length,
      unreadNewsCount: news.filter((item) => item.isUnread).length,
      hasAnything: items.length > 0 || routines.length > 0,
      runningRoutineNames: runningNames(routinesQuery.data ?? []),
      detection: null,
    };
  }, [
    useSampleData,
    categories,
    status,
    hasRoutines,
    arrivals,
    notificationsQuery.data,
    routinesQuery.data,
  ]);
}

const relativeTime = new Intl.RelativeTimeFormat('de', { numeric: 'auto' });

export function formatRelative(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffHours = Math.round(diffMs / HOUR);
  if (Math.abs(diffHours) < 1) {
    return relativeTime.format(Math.round(diffMs / 60000), 'minute');
  }
  if (Math.abs(diffHours) < 24) return relativeTime.format(diffHours, 'hour');
  return relativeTime.format(Math.round(diffHours / 24), 'day');
}

export function taskFeedItems(feed: HomeFeed): FeedItem[] {
  return feed.tasks.map((task) => ({
    id: task.id,
    kind: 'task',
    title: task.title,
    source: `${task.source} · fällig ${task.due.toLowerCase()}`,
    createdAt: '',
    isUnread: false,
    notificationId: null,
  }));
}

export function unreadFeedItems(feed: HomeFeed): FeedItem[] {
  return [...feed.routineResults, ...feed.news]
    .filter((item) => item.isUnread)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
