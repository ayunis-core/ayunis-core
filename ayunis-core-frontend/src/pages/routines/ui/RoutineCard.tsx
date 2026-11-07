import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Badge } from '@ayunis/ui/components/badge';
import {
  RoutineEnabledSwitch,
  RoutineRunNowButton,
  RoutineRunStatusLine,
  RoutineScheduleLine,
  type Routine,
} from '@/features/routines';

interface RoutineCardProps {
  routine: Routine;
}

export default function RoutineCard({ routine }: Readonly<RoutineCardProps>) {
  const { t } = useTranslation('routines');

  return (
    // The link stretches over the whole row so the switch and Run now can sit
    // above it instead of being nested inside an anchor.
    <Item
      variant="outline"
      className="relative has-[a:hover]:bg-accent/50"
      data-testid="routine-card"
    >
      <ItemContent>
        <ItemTitle>
          <Link
            to="/routines/$routineId"
            params={{ routineId: routine.id }}
            className="outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
          >
            <span data-testid="routine-card-name">{routine.name}</span>
          </Link>
          {routine.internetEnabled && (
            <Badge variant="outline" className="gap-1">
              <Globe className="size-3" />
              {t('card.internet')}
            </Badge>
          )}
        </ItemTitle>
        <ItemDescription>
          {t('card.schedule', { time: routine.dailyTime })}
        </ItemDescription>
        <div className="flex flex-col gap-1 text-sm">
          <RoutineScheduleLine routine={routine} />
          <RoutineRunStatusLine routine={routine} />
        </div>
      </ItemContent>
      <ItemActions className="relative z-10">
        <RoutineEnabledSwitch routine={routine} testId="routine-card-enabled" />
        <RoutineRunNowButton routine={routine} testId="routine-card-run-now" />
      </ItemActions>
    </Item>
  );
}
