import {
  taskFeedItems,
  type FeedItem,
  type HomeFeed,
} from '@/features/home-feed';

export interface PlinthSection {
  id: 'failed' | 'results' | 'news' | 'tasks';
  kind: 'routine_error' | 'routine' | 'news' | 'task';
  count: number;
  label: string;
  items: FeedItem[];
}

export function buildPlinthSections(
  feed: HomeFeed,
  seenIds: ReadonlySet<string> = new Set(),
): PlinthSection[] {
  const isNew = (item: FeedItem) => item.isUnread && !seenIds.has(item.id);
  const failed = feed.routineResults.filter(
    (item) => item.kind === 'routine_error' && isNew(item),
  );
  const results = feed.routineResults.filter(
    (item) => item.kind === 'routine' && isNew(item),
  );
  const news = feed.news.filter(isNew);
  const tasks = taskFeedItems(feed).filter((item) => !seenIds.has(item.id));
  const sections: PlinthSection[] = [
    {
      id: 'failed',
      kind: 'routine_error',
      count: failed.length,
      label: 'Fehler',
      items: failed,
    },
    {
      id: 'results',
      kind: 'routine',
      count: results.length,
      label: 'Routinen',
      items: results,
    },
    {
      id: 'news',
      kind: 'news',
      count: news.length,
      label: 'Neuigkeiten',
      items: news,
    },
    {
      id: 'tasks',
      kind: 'task',
      count: tasks.length,
      label: 'Aufgaben',
      items: tasks,
    },
  ];
  return sections.filter((section) => section.count > 0);
}

export type PlinthStatus =
  { kind: 'running'; text: string } | { kind: 'detected'; label: string };

export function plinthStatus(feed: HomeFeed): PlinthStatus | null {
  const running = feed.runningRoutineNames;
  if (running.length === 1) {
    return { kind: 'running', text: `${running[0]} läuft gerade` };
  }
  if (running.length > 1) {
    return {
      kind: 'running',
      text: `${running.length} Routinen laufen gerade`,
    };
  }
  if (feed.detection) {
    return { kind: 'detected', label: feed.detection.label };
  }
  return null;
}
