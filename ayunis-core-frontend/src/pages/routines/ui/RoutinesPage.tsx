import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import type { ChatStarterDefaults } from '@/widgets/chat-starter';
import { useRoutines } from '@/pages/routines/api/useRoutines';
import CreateRoutineMenu from './CreateRoutineMenu';
import RoutineCard from './RoutineCard';
import RoutinesEmptyState from './RoutinesEmptyState';

interface RoutinesPageProps {
  chatStarter: ChatStarterDefaults;
}

export default function RoutinesPage({
  chatStarter,
}: Readonly<RoutinesPageProps>) {
  const { t } = useTranslation('routines');
  const { routines, isLoading } = useRoutines();

  if (!isLoading && routines.length === 0) {
    return (
      <AppLayout>
        <FullScreenMessageLayout
          header={
            <ContentAreaHeader breadcrumbs={[{ label: t('page.title') }]} />
          }
        >
          <RoutinesEmptyState chatStarter={chatStarter} />
        </FullScreenMessageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[{ label: t('page.title') }]}
            action={<CreateRoutineMenu />}
          />
        }
        contentArea={
          <div className="space-y-3" data-testid="routines-list">
            {routines.map((routine) => (
              <RoutineCard key={routine.id} routine={routine} />
            ))}
          </div>
        }
      />
    </AppLayout>
  );
}
