import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Gift } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  isAdventDoorOpened,
  useAdventCalendar,
} from '@/features/advent-calendar';
import { adventCalendarCardDoor } from '@/pages/new-chat/lib/advent-calendar-card';

export function AdventCalendarCard({
  className,
}: Readonly<{ className?: string }>) {
  const { t } = useTranslation('chat');
  const { calendar } = useAdventCalendar();
  const day = calendar
    ? adventCalendarCardDoor(calendar, isAdventDoorOpened)
    : null;
  if (day === null) return null;

  return (
    <Button asChild variant="outline" size="xs" className={className}>
      <Link
        to="/advent-calendar"
        search={{ door: day }}
        data-testid="new-chat-advent-calendar-card"
        data-day={day}
      >
        <Gift className="text-brand" />
        {t('newChat.adventCalendarCard', { day })}
        <ArrowRight className="text-brand" aria-hidden />
      </Link>
    </Button>
  );
}
