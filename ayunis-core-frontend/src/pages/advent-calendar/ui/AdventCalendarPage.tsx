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
import { Label } from '@ayunis/ui/components/label';
import { Switch } from '@ayunis/ui/components/switch';
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
  useAdventCalendar,
  useOpenedAdventDoors,
} from '@/features/advent-calendar';
import { useAdventEffects } from '@/pages/advent-calendar/lib/useAdventEffects';
import { AdventCalendarBoard } from './AdventCalendarBoard';
import { AdventCalendarDoorDialog } from './AdventCalendarDoorDialog';

interface AdventCalendarPageProps {
  door?: number;
}

export default function AdventCalendarPage({
  door,
}: Readonly<AdventCalendarPageProps>) {
  const { t } = useTranslation('advent-calendar');
  const { calendar, receivedAt, isShown, isLoading, error, refetch } =
    useAdventCalendar();
  const { effectsOn, setEffectsOn } = useAdventEffects();

  let content = null;
  if (calendar && isShown) {
    content = (
      <AdventCalendar
        calendar={calendar}
        receivedAt={receivedAt}
        effectsOn={effectsOn}
        selectedDoor={door}
        onDoorDue={() => void refetch()}
      />
    );
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
          <ContentAreaHeader
            breadcrumbs={[{ label: t('page.title') }]}
            action={
              calendar &&
              isShown && (
                <EffectsSwitch checked={effectsOn} onChange={setEffectsOn} />
              )
            }
          />
        }
        contentArea={content}
      />
    </AppLayout>
  );
}

interface EffectsSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function EffectsSwitch({ checked, onChange }: Readonly<EffectsSwitchProps>) {
  const { t } = useTranslation('advent-calendar');
  return (
    <div className="flex items-center gap-2">
      <Switch
        id="advent-calendar-effects"
        checked={checked}
        onCheckedChange={onChange}
        data-testid="advent-calendar-effects-switch"
      />
      <Label htmlFor="advent-calendar-effects">{t('effects.label')}</Label>
    </div>
  );
}

interface AdventCalendarProps {
  calendar: AdventCalendarResponseDto;
  receivedAt: number;
  effectsOn: boolean;
  selectedDoor?: number;
  onDoorDue: () => void;
}

function AdventCalendar({
  calendar,
  receivedAt,
  effectsOn,
  selectedDoor,
  onDoorDue,
}: Readonly<AdventCalendarProps>) {
  const { t } = useTranslation('advent-calendar');
  const navigate = useNavigate({ from: '/advent-calendar' });
  const { isOpened, markOpened } = useOpenedAdventDoors(
    adventSeasonYear(new Date(calendar.now)),
  );

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
      <AdventCalendarBoard
        calendar={calendar}
        receivedAt={receivedAt}
        effectsOn={effectsOn}
        isOpened={isOpened}
        onOpen={selectDoor}
        onDoorDue={onDoorDue}
      />
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
