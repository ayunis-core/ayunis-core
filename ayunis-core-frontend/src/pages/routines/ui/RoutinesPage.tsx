import { useTranslation } from 'react-i18next';
import { CalendarClock, Clock, Inbox, PencilLine } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { EmptyState } from '@/widgets/empty-state';
import { ChatStarter, type ChatStarterDefaults } from '@/widgets/chat-starter';
import { useRoutines } from '@/pages/routines/api/useRoutines';
import CreateRoutineMenu from './CreateRoutineMenu';
import RoutineCard from './RoutineCard';

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
          <EmptyState
            testId="routines-empty-state"
            icon={CalendarClock}
            title={t('emptyState.title')}
            description={t('emptyState.description')}
            steps={[
              {
                icon: PencilLine,
                title: t('emptyState.steps.describe.title'),
                description: t('emptyState.steps.describe.description'),
              },
              {
                icon: Clock,
                title: t('emptyState.steps.schedule.title'),
                description: t('emptyState.steps.schedule.description'),
              },
              {
                icon: Inbox,
                title: t('emptyState.steps.results.title'),
                description: t('emptyState.steps.results.description'),
              },
            ]}
            action={<CreateRoutineMenu buttonText={t('createMenu.first')} />}
            guide={
              <ChatStarter
                {...chatStarter}
                origin={{ kind: 'feature_guide', feature: 'routines' }}
                placeholder={t('emptyState.askPlaceholder')}
              />
            }
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
