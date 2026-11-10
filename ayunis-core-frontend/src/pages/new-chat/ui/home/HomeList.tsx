import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Plus } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import {
  formatRelative,
  type FeedItem,
  type HomeFeed,
} from '@/features/home-feed';
import { FeedIcon, FeedItemLink } from '@/features/home-feed';

type Filter = 'all' | 'routines' | 'news' | 'tasks';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Alles' },
  { id: 'routines', label: 'Routinen' },
  { id: 'news', label: 'Neuigkeiten' },
  { id: 'tasks', label: 'Aufgaben' },
];

const MAX_ROWS = 4;

function taskItems(feed: HomeFeed): FeedItem[] {
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

function itemsFor(feed: HomeFeed, filter: Filter): FeedItem[] {
  if (filter === 'routines') return feed.routineResults;
  if (filter === 'news') return feed.news;
  if (filter === 'tasks') return taskItems(feed);
  const dated = [...feed.routineResults, ...feed.news].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return [...dated, ...taskItems(feed)];
}

const ROW_CLASS =
  'group flex h-11 items-center gap-3 rounded-md px-2 text-sm transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none';

function ListRow({ item }: Readonly<{ item: FeedItem }>) {
  return (
    <FeedItemLink item={item} className={ROW_CLASS}>
      <FeedIcon kind={item.kind} />
      <span
        className={cn(
          'truncate',
          item.isUnread ? 'font-medium text-foreground' : 'text-foreground/80',
        )}
      >
        {item.title}
      </span>
      <span className="hidden truncate text-muted-foreground sm:inline">
        {item.source}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-muted-foreground tabular-nums">
        {item.isUnread && (
          <span className="size-1.5 rounded-full bg-brand" aria-hidden />
        )}
        {item.createdAt ? formatRelative(item.createdAt) : null}
      </span>
    </FeedItemLink>
  );
}

export function HomeList({ feed }: Readonly<{ feed: HomeFeed }>) {
  const [filter, setFilter] = useState<Filter>('all');
  const items = itemsFor(feed, filter).slice(0, MAX_ROWS);
  const isInvite = !feed.hasAnything && feed.tasks.length === 0;

  if (isInvite) {
    return (
      <div className="home-list w-full px-2">
        <Link to="/routines" className={ROW_CLASS}>
          <Plus className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-medium">Erste Routine einrichten</span>
          <span className="truncate text-muted-foreground">
            Ayunis Core prüft täglich Ihre Quellen für Sie
          </span>
          <ArrowRight className="ml-auto size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="home-list flex w-full flex-col gap-1 px-2">
      <div className="flex items-center gap-3 px-2 pb-1 text-xs">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFilter(option.id)}
            className={cn(
              'transition-colors hover:text-foreground focus-visible:underline focus-visible:outline-none',
              filter === option.id
                ? 'font-medium text-foreground'
                : 'text-muted-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
        <Link
          to="/inbox"
          className="group ml-auto flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          Posteingang
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div key={filter} className="flex min-h-44 flex-col">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="border-b border-border/60 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 fill-mode-both last:border-b-0"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <ListRow item={item} />
          </div>
        ))}
        {items.length === 0 && (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            Hier gibt es gerade nichts Neues.
          </p>
        )}
      </div>
    </div>
  );
}
