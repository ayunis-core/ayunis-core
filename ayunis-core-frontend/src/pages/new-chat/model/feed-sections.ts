import {
  taskFeedItems,
  type FeedItem,
  type HomeFeed,
} from '@/features/home-feed';

export interface FeedSection {
  id: string;
  kind: 'routine' | 'news' | 'task';
  label: string;
  count: number;
  items: FeedItem[];
  more: { to: '/inbox' | '/routines'; label: string };
}

export function buildFeedSections(feed: HomeFeed): FeedSection[] {
  const tabs: FeedSection[] = [];
  if (feed.routineResults.length > 0) {
    tabs.push({
      id: 'routines',
      kind: 'routine',
      label: 'Routinen',
      count: feed.unreadRoutineCount,
      items: feed.routineResults,
      more: { to: '/inbox', label: 'Alle Ergebnisse' },
    });
  }
  if (feed.news.length > 0) {
    tabs.push({
      id: 'news',
      kind: 'news',
      label: 'Neuigkeiten',
      count: feed.unreadNewsCount,
      items: feed.news,
      more: { to: '/inbox', label: 'Alle Neuigkeiten' },
    });
  }
  if (feed.tasks.length > 0) {
    tabs.push({
      id: 'tasks',
      kind: 'task',
      label: 'Aufgaben',
      count: feed.tasks.length,
      items: taskFeedItems(feed),
      more: { to: '/inbox', label: 'Alle Aufgaben' },
    });
  }
  return tabs;
}
