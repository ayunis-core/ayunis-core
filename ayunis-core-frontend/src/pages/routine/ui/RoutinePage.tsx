import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ayunis/ui/components/tabs';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import {
  RoutineEnabledSwitch,
  RoutineRunNowButton,
  type Routine,
} from '@/features/routines';
import { useRoutine } from '@/pages/routine/api/useRoutine';
import type { RoutineTab } from '@/pages/routine/model/constants';
import { RoutineChatsTab } from './RoutineChatsTab';
import { RoutineConfigurationTab } from './RoutineConfigurationTab';
import { RoutineDeleteButton } from './RoutineDeleteButton';
import { RoutineNotificationsTab } from './RoutineNotificationsTab';
import { RoutineRunStatusBadge } from './RoutineRunStatusBadge';

interface RoutinePageProps {
  routine: Routine;
  tab: RoutineTab;
  page: number;
}

export default function RoutinePage(props: Readonly<RoutinePageProps>) {
  const { t } = useTranslation('routines');
  const navigate = useNavigate();
  const { routine } = useRoutine(props.routine);

  const handleTabChange = (value: string) =>
    void navigate({
      to: '/routines/$routineId',
      params: { routineId: routine.id },
      search: value === 'configuration' ? {} : { tab: value as RoutineTab },
    });

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: t('page.title'), href: '/routines' },
              { label: routine.name },
            ]}
            badge={<RoutineRunStatusBadge routine={routine} />}
            action={
              <>
                <RoutineEnabledSwitch
                  routine={routine}
                  testId="routine-detail-enabled"
                />
                <RoutineRunNowButton
                  routine={routine}
                  testId="routine-detail-run-now"
                />
                <RoutineDeleteButton routine={routine} />
              </>
            }
          />
        }
        contentArea={
          <div data-testid="routine-detail">
            <Tabs
              value={props.tab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList>
                <TabsTrigger
                  value="configuration"
                  data-testid="routine-tab-configuration"
                >
                  {t('detail.tabs.configuration')}
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  data-testid="routine-tab-notifications"
                >
                  {t('detail.tabs.notifications')}
                </TabsTrigger>
                <TabsTrigger value="chats" data-testid="routine-tab-chats">
                  {t('detail.tabs.chats')}
                </TabsTrigger>
              </TabsList>
              {/* Stays mounted, so unsaved edits survive a look at another tab. */}
              <TabsContent
                value="configuration"
                forceMount
                className="mt-4 data-[state=inactive]:hidden"
              >
                <RoutineConfigurationTab routine={routine} />
              </TabsContent>
              <TabsContent value="notifications" className="mt-4">
                <RoutineNotificationsTab
                  routineId={routine.id}
                  page={props.page}
                />
              </TabsContent>
              <TabsContent value="chats" className="mt-4">
                <RoutineChatsTab routineId={routine.id} page={props.page} />
              </TabsContent>
            </Tabs>
          </div>
        }
      />
    </AppLayout>
  );
}
