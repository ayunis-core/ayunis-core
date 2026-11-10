import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { CheckCheck } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Tabs, TabsList, TabsTrigger } from '@ayunis/ui/components/tabs';
import { cn } from '@ayunis/ui/lib/cn';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import {
  PrototypeSwitcher,
  PrototypeSwitcherToggle,
} from '@/widgets/prototype-switcher';
import {
  NEWS_CATEGORIES,
  NewsCover,
  useNews,
  useReadToggle,
  type NewsCategory,
  type NewsItem,
} from '@/features/home-feed';
import { CATEGORY_LABEL, formatNewsDate } from '@/pages/news/model/format';

function Kicker({ entry }: Readonly<{ entry: NewsItem }>) {
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      {entry.isUnread && (
        <span className="size-1.5 rounded-full bg-brand" aria-hidden />
      )}
      {CATEGORY_LABEL[entry.category]} · {formatNewsDate(entry.date)}
      {entry.isForAdmins && <Badge variant="secondary">Für Admins</Badge>}
    </span>
  );
}

function FeaturedEntry({ entry }: Readonly<{ entry: NewsItem }>) {
  return (
    <Link
      to="/news/$newsId"
      params={{ newsId: entry.id }}
      className="group flex flex-col gap-4 rounded-2xl p-2 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <NewsCover
        cover={entry.cover}
        className="aspect-[16/7] w-full transition-transform duration-500 group-hover:scale-[1.01]"
      />
      <div className="flex flex-col gap-1.5 px-2 pb-2">
        <Kicker entry={entry} />
        <h2 className="text-xl font-semibold">{entry.title}</h2>
        <p className="text-sm text-muted-foreground">{entry.summary}</p>
      </div>
    </Link>
  );
}

function EntryRow({ entry }: Readonly<{ entry: NewsItem }>) {
  return (
    <Link
      to="/news/$newsId"
      params={{ newsId: entry.id }}
      className="flex items-center gap-4 rounded-xl p-2 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <NewsCover
        cover={entry.cover}
        size="small"
        className="h-16 w-24 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Kicker entry={entry} />
        <span
          className={cn(
            'truncate text-sm',
            entry.isUnread ? 'font-medium' : 'text-foreground/80',
          )}
        >
          {entry.title}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {entry.summary}
        </span>
      </div>
    </Link>
  );
}

export function NewsPage() {
  const news = useNews();
  const { setRead } = useReadToggle();
  const [category, setCategory] = useState<NewsCategory | 'all'>('all');
  const visible = news.filter(
    (entry) => category === 'all' || entry.category === category,
  );
  const featured = visible.at(0);
  const rest = visible.slice(1);
  const unread = news.filter((entry) => entry.isUnread);

  return (
    <AppLayout>
      <PrototypeSwitcher />
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[{ label: 'Neuigkeiten' }]}
            action={
              <>
                <PrototypeSwitcherToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={unread.length === 0}
                  onClick={() =>
                    unread.forEach((entry) => setRead(entry.id, true))
                  }
                >
                  <CheckCheck />
                  Alle als gelesen markieren
                </Button>
              </>
            }
          />
        }
        contentArea={
          <div className="flex flex-col gap-6 pt-2">
            <div className="flex flex-col gap-4">
              <Tabs
                value={category}
                onValueChange={(value) =>
                  setCategory(value as NewsCategory | 'all')
                }
              >
                <TabsList>
                  <TabsTrigger value="all">Alle</TabsTrigger>
                  {NEWS_CATEGORIES.map((entry) => (
                    <TabsTrigger key={entry.id} value={entry.id}>
                      {entry.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            {featured ? (
              <div
                key={category}
                className="flex flex-col gap-2 animate-in fade-in-0 duration-300"
              >
                <FeaturedEntry entry={featured} />
                <div className="flex flex-col gap-1">
                  {rest.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                In dieser Kategorie gibt es noch nichts.
              </p>
            )}
          </div>
        }
      />
    </AppLayout>
  );
}
