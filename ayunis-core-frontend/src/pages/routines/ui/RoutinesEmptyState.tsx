import { useTranslation } from 'react-i18next';
import { CalendarClock, Clock, Inbox, PencilLine } from 'lucide-react';
import { EmptyState, EmptyStateMarketplace } from '@/widgets/empty-state';
import { ChatStarter, type ChatStarterDefaults } from '@/widgets/chat-starter';
import { useSuggestedMarketplaceRoutines } from '@/features/marketplace';
import { RoutineScheduleSummary } from '@/features/routines';
import CreateRoutineMenu from './CreateRoutineMenu';

interface RoutinesEmptyStateProps {
  chatStarter: ChatStarterDefaults;
}

export default function RoutinesEmptyState({
  chatStarter,
}: Readonly<RoutinesEmptyStateProps>) {
  const { t } = useTranslation('routines');
  const { marketplaceUrl, suggestions } = useSuggestedMarketplaceRoutines();

  return (
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
      suggestions={
        marketplaceUrl &&
        suggestions.length > 0 && (
          <EmptyStateMarketplace
            kind="routine"
            entries={suggestions.map((routine) => ({
              ...routine,
              meta: (
                <>
                  <Clock className="size-3.5" />
                  <RoutineScheduleSummary schedule={routine.schedule} />
                </>
              ),
            }))}
            marketplaceUrl={marketplaceUrl}
            fallbackIcon={CalendarClock}
          />
        )
      }
      guide={
        <ChatStarter
          {...chatStarter}
          origin={{ kind: 'feature_guide', feature: 'routines' }}
          placeholder={t('emptyState.askPlaceholder')}
        />
      }
    />
  );
}
