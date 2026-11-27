import { useTranslation } from 'react-i18next';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Switch } from '@ayunis/ui/components/switch';
import { useSetAdventCalendarEnabled } from '@/pages/super-admin-settings/advent-calendar/api/useSetAdventCalendarEnabled';

interface AdventCalendarEnabledCardProps {
  enabled: boolean;
}

export default function AdventCalendarEnabledCard({
  enabled,
}: Readonly<AdventCalendarEnabledCardProps>) {
  const { t } = useTranslation('super-admin-settings-advent-calendar');
  const { setEnabled, isPending } = useSetAdventCalendarEnabled();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <label htmlFor="advent-calendar-enabled">{t('enabled.title')}</label>
        </CardTitle>
        <CardDescription>{t('enabled.description')}</CardDescription>
        <CardAction>
          <Switch
            id="advent-calendar-enabled"
            data-testid="advent-calendar-enabled-switch"
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={isPending}
          />
        </CardAction>
      </CardHeader>
    </Card>
  );
}
