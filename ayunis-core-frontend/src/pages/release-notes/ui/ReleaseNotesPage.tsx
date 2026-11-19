import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import type { ReleaseNoteResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { EmptyState } from '@/widgets/empty-state';
import { useReleaseNotes } from '@/pages/release-notes/api/useReleaseNotes';
import { ReleaseNoteListItem } from './ReleaseNoteListItem';

interface ReleaseNotesPageProps {
  releaseNotes: ReleaseNoteResponseDto[];
}

export default function ReleaseNotesPage(
  props: Readonly<ReleaseNotesPageProps>,
) {
  const { t } = useTranslation('release-notes');
  const { releaseNotes } = useReleaseNotes(props.releaseNotes);
  const header = (
    <ContentAreaHeader breadcrumbs={[{ label: t('page.title') }]} />
  );

  if (releaseNotes.length === 0) {
    return (
      <AppLayout>
        <FullScreenMessageLayout header={header}>
          <EmptyState
            title={t('emptyState.title')}
            description={t('emptyState.description')}
          />
        </FullScreenMessageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={header}
        contentArea={
          <ul className="flex flex-col gap-2 py-2" data-testid="release-notes">
            {releaseNotes.map((releaseNote) => (
              <ReleaseNoteListItem
                key={releaseNote.id}
                releaseNote={releaseNote}
              />
            ))}
          </ul>
        }
      />
    </AppLayout>
  );
}
