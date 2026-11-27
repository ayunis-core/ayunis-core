import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import {
  ReleaseNoteChatStarter,
  ReleaseNoteContent,
  ReleaseNoteKicker,
} from '@/widgets/release-note-content';
import { useMarkReleaseNoteRead } from '@/features/release-notes';
import type { ReleaseNoteResponseDto } from '@ayunis/api-client/schemas';
import { useReleaseNote } from '@/pages/release-note/api/useReleaseNote';

interface ReleaseNotePageProps {
  releaseNote: ReleaseNoteResponseDto;
  selectedModelId?: string;
  isEmbeddingModelEnabled: boolean;
}

export default function ReleaseNotePage(props: Readonly<ReleaseNotePageProps>) {
  const { t } = useTranslation('release-notes');
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
              <p className="text-sm text-muted-foreground">
                <ReleaseNoteKicker date={releaseNote.date} />
              </p>
              <h1
                className="text-2xl font-semibold"
                data-testid="release-note-detail-headline"
              >
                {releaseNote.headline}
              </h1>
            </header>
            <ReleaseNoteContent releaseNote={releaseNote} />
            <ReleaseNoteChatStarter
              releaseNoteId={releaseNote.id}
              selectedModelId={props.selectedModelId}
              isEmbeddingModelEnabled={props.isEmbeddingModelEnabled}
            />
          </article>
        }
      />
    </AppLayout>
  );
}
