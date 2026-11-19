import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { ChatStarter } from '@/widgets/chat-starter';
import { Markdown } from '@/widgets/markdown';
import { NotificationMedia } from '@/features/notifications';
import {
  formatReleaseNoteDate,
  releaseNoteImageUrl,
  useMarkReleaseNoteRead,
} from '@/features/release-notes';
import type { ReleaseNoteResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useReleaseNote } from '@/pages/release-note/api/useReleaseNote';

interface ReleaseNotePageProps {
  releaseNote: ReleaseNoteResponseDto;
  selectedModelId?: string;
  isEmbeddingModelEnabled: boolean;
}

export default function ReleaseNotePage(props: Readonly<ReleaseNotePageProps>) {
  const { t, i18n } = useTranslation('release-notes');
  const { releaseNote } = useReleaseNote(props.releaseNote);
  const { mutate: markRead } = useMarkReleaseNoteRead();

  // Opening an update reads it.
  useEffect(() => {
    if (releaseNote.unread) markRead(releaseNote.id);
  }, [releaseNote.unread, releaseNote.id, markRead]);

  return (
    <AppLayout>
      <ContentAreaLayout
        resetKey={releaseNote.id}
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: t('page.title'), href: '/news' },
              { label: releaseNote.headline },
            ]}
          />
        }
        contentArea={
          <article
            className="flex flex-col gap-6 py-2"
            data-testid="release-note-detail"
          >
            <header className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Megaphone className="size-4" aria-hidden />
                {t('detail.kicker', {
                  date: formatReleaseNoteDate(releaseNote.date, i18n.language),
                })}
              </p>
              <h1
                className="text-2xl font-semibold"
                data-testid="release-note-detail-headline"
              >
                {releaseNote.headline}
              </h1>
            </header>
            <NotificationMedia
              media={releaseNote.media}
              imageSrc={releaseNoteImageUrl(releaseNote.id)}
              title={releaseNote.headline}
              testIdPrefix="release-note-detail"
            />
            <Markdown renderImages={false} className="text-sm">
              {releaseNote.body}
            </Markdown>
            <div data-testid="release-note-chat-starter">
              <ChatStarter
                sourceReleaseNoteId={releaseNote.id}
                placeholder={t('detail.chatPlaceholder')}
                selectedModelId={props.selectedModelId}
                isEmbeddingModelEnabled={props.isEmbeddingModelEnabled}
              />
            </div>
          </article>
        }
      />
    </AppLayout>
  );
}
