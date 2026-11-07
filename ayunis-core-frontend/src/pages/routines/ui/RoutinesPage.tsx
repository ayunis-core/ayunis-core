import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { EmptyState } from '@/widgets/empty-state';
import { useRoutines } from '@/pages/routines/api/useRoutines';
import CreateRoutineMenu from './CreateRoutineMenu';
import RoutineCard from './RoutineCard';

export default function RoutinesPage() {
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
          <EmptyState
            title={t('emptyState.title')}
            description={t('emptyState.description')}
            action={<CreateRoutineMenu buttonText={t('createMenu.first')} />}
          />
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
