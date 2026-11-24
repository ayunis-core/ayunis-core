import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { OwnerSections } from '@/features/resource-ownership';
import type { RecordingResponseDto } from '@ayunis/api-client/schemas';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import type { ChatStarterDefaults } from '@/widgets/chat-starter';
import CreateRecordingDialog from './CreateRecordingDialog';
import RecordingCard from './RecordingCard';
import RecordingsEmptyState from './RecordingsEmptyState';

interface RecordingsPageProps {
  recordings: RecordingResponseDto[];
  chatStarter: ChatStarterDefaults;
}

export default function RecordingsPage({
  recordings,
  chatStarter,
}: Readonly<RecordingsPageProps>) {
  const { t } = useTranslation('recordings');
  const header = (
    <ContentAreaHeader
      breadcrumbs={[{ label: t('page.title') }]}
      action={<CreateRecordingDialog />}
    />
  );

  if (recordings.length === 0) {
    return (
      <AppLayout>
        <FullScreenMessageLayout header={header}>
          <RecordingsEmptyState chatStarter={chatStarter} />
        </FullScreenMessageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={header}
        contentArea={
          <OwnerSections
            items={recordings}
            testIdPrefix="recordings"
            renderItem={(recording) => (
              <RecordingCard key={recording.id} recording={recording} />
            )}
          />
        }
      />
    </AppLayout>
  );
}
