import { useEffect, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { CalendarX, Eye } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';
import { Button } from '@ayunis/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import type { AdventCalendarResponseDto } from '@ayunis/api-client/schemas';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import {
  adventSeasonYear,
  litCandleCount,
  todaysDoor,
  useAdventCalendar,
  useOpenedAdventDoors,
} from '@/features/advent-calendar';
import { doorDisplayState } from '@/pages/advent-calendar/model/door-display-state';
import { AdventWreath } from './AdventWreath';
import { AdventCalendarDoor } from './AdventCalendarDoor';
import { AdventCalendarDoorDialog } from './AdventCalendarDoorDialog';

interface AdventCalendarPageProps {
  door?: number;
}

export default function AdventCalendarPage({
  door,
}: Readonly<AdventCalendarPageProps>) {
  const { t } = useTranslation('advent-calendar');
  const { calendar, isShown, isLoading, error, refetch } = useAdventCalendar();

  let content = null;
  if (calendar && isShown) {
    content = <AdventCalendar calendar={calendar} selectedDoor={door} />;
  } else if (error) {
    content = (
      <CalendarMessage
        title={t('error.title')}
        action={
          <Button variant="outline" onClick={() => void refetch()}>
            {t('error.retry')}
          </Button>
        }
      />
    );
  } else if (!isLoading) {
    content = (
      <CalendarMessage
        title={t('notAvailable.title')}
        description={t('notAvailable.description')}
        testId="advent-calendar-not-available"
      />
    );
  }

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader breadcrumbs={[{ label: t('page.title') }]} />
        }
        contentArea={content}
      />
    </AppLayout>
  );
}

interface AdventCalendarProps {
  calendar: AdventCalendarResponseDto;
  selectedDoor?: number;
}

function AdventCalendar({
  calendar,
  selectedDoor,
}: Readonly<AdventCalendarProps>) {
  const { t } = useTranslation('advent-calendar');
  const navigate = useNavigate({ from: '/advent-calendar' });
  const now = new Date(calendar.now);
  const today = todaysDoor(now);
  const { isOpened, markOpened } = useOpenedAdventDoors(adventSeasonYear(now));

  const openDoor = calendar.doors.find(
    (candidate) => candidate.day === selectedDoor && candidate.content,
  );
  const openDay = openDoor?.day;
  // A super admin's preview before the season must not use up their doors.
  const remembersOpened = calendar.visible;
  useEffect(() => {
    if (openDay !== undefined && remembersOpened) markOpened(openDay);
  }, [openDay, remembersOpened, markOpened]);

  const selectDoor = (day: number | undefined) =>
    void navigate({ search: { door: day }, replace: true });

  return (
    <div className="flex flex-col gap-6 py-2" data-testid="advent-calendar">
      {calendar.preview && (
        <Alert data-testid="advent-calendar-preview-banner">
          <Eye />
          <AlertTitle>{t('preview.title')}</AlertTitle>
          <AlertDescription>{t('preview.description')}</AlertDescription>
        </Alert>
      )}
      <div className="advent-calendar-board grid grid-flow-row-dense grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3">
        <div className="col-span-2 col-start-2 row-span-2 row-start-3 flex items-center sm:col-start-3 sm:row-span-3 sm:row-start-2">
          <AdventWreath litCandles={litCandleCount(now)} />
        </div>
        {calendar.doors.map((calendarDoor) => (
          <AdventCalendarDoor
            key={calendarDoor.day}
            day={calendarDoor.day}
            state={doorDisplayState(calendarDoor, isOpened)}
            isToday={calendarDoor.day === today}
            onOpen={selectDoor}
          />
        ))}
      </div>
      <AdventCalendarDoorDialog
        door={
          openDoor?.content
            ? { day: openDoor.day, content: openDoor.content }
            : null
        }
        onClose={() => selectDoor(undefined)}
      />
    </div>
  );
}

interface CalendarMessageProps {
  title: string;
  description?: string;
  action?: ReactNode;
  testId?: string;
}

function CalendarMessage({
  title,
  description,
  action,
  testId,
}: Readonly<CalendarMessageProps>) {
  return (
    <Empty data-testid={testId}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarX />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
