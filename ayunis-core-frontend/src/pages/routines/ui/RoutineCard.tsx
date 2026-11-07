import { useNavigate } from '@tanstack/react-router';
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
  const navigate = useNavigate();

  return (
    <Item
      variant="outline"
      className="cursor-pointer"
      data-testid="routine-card"
      onClick={() =>
        void navigate({
          to: '/routines/$routineId',
          params: { routineId: routine.id },
        })
      }
    >
      <ItemContent>
        <ItemTitle>
          <span data-testid="routine-card-name">{routine.name}</span>
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
      <ItemActions onClick={(event) => event.stopPropagation()}>
        <RoutineEnabledSwitch routine={routine} testId="routine-card-enabled" />
        <RoutineRunNowButton routine={routine} testId="routine-card-run-now" />
      </ItemActions>
    </Item>
  );
}
