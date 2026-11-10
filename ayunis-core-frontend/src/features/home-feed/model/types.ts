export type FeedKind = 'routine' | 'routine_error' | 'news' | 'task';

export interface FeedItem {
  id: string;
  kind: FeedKind;
  title: string;
  source: string;
  createdAt: string;
  isUnread: boolean;
  notificationId: string | null;
}

export interface FeedRoutine {
  id: string | null;
  name: string;
  dailyTime: string;
  nextRunAt: string | null;
  hasFailed: boolean;
}

export interface FeedTask {
  id: string;
  title: string;
  due: string;
  source: string;
}

export interface HomeFeed {
  routineResults: FeedItem[];
  news: FeedItem[];
  routines: FeedRoutine[];
  tasks: FeedTask[];
  unreadRoutineCount: number;
  unreadNewsCount: number;
  hasAnything: boolean;
  runningRoutineNames: string[];
  detection: Detection | null;
}

export interface Detection {
  kind: 'routine' | 'skill' | 'knowledge';
  label: string;
  pattern: string;
  proposal: string;
  action: string;
  to: '/routines' | '/skills' | '/knowledge-bases';
}
