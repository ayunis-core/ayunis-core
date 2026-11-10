import { useEffect, useRef } from 'react';
import { Megaphone } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { Markdown } from '@/widgets/markdown';
import { ChatStarter } from '@/widgets/chat-starter';
import { NewsCover, useNews, useReadToggle } from '@/features/home-feed';
import { CATEGORY_KICKER, formatNewsDate } from '@/pages/news/model/format';

export function NewsDetailPage({
  newsId,
  selectedModelId,
  isEmbeddingModelEnabled,
}: Readonly<{
  newsId: string;
  selectedModelId?: string;
  isEmbeddingModelEnabled: boolean;
}>) {
  const news = useNews();
  const { setRead } = useReadToggle();
  const entry = news.find((item) => item.id === newsId);

  const readId = useRef<string | null>(null);
  useEffect(() => {
    if (!entry || readId.current === entry.id) return;
    readId.current = entry.id;
    if (entry.isUnread) setRead(entry.id, true);
  }, [entry, setRead]);

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: 'Neuigkeiten', href: '/news' },
              { label: entry?.title ?? 'Update' },
            ]}
          />
        }
        contentArea={
          entry ? (
            <article className="flex flex-col gap-6 pt-2 pb-10 animate-in fade-in-0 duration-300">
              <div className="flex flex-col gap-3">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex size-6 items-center justify-center rounded-md bg-muted">
                    <Megaphone className="size-3.5" />
                  </span>
                  {CATEGORY_KICKER[entry.category]} vom{' '}
                  {formatNewsDate(entry.date)}
                  {entry.isForAdmins && (
                    <Badge variant="secondary">Für Admins</Badge>
                  )}
                </span>
                <h1 className="text-2xl font-semibold">{entry.title}</h1>
              </div>
              <NewsCover cover={entry.cover} className="aspect-[16/8] w-full" />
              <Markdown renderImages={false} className="text-sm">
                {entry.body}
              </Markdown>
              <ChatStarter
                placeholder="Frage zu diesem Update stellen"
                selectedModelId={selectedModelId}
                isEmbeddingModelEnabled={isEmbeddingModelEnabled}
              />
            </article>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Dieses Update gibt es nicht mehr.
            </p>
          )
        }
      />
    </AppLayout>
  );
}
