import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { CalendarClock } from 'lucide-react';
import { DynamicIcon, iconNames, type IconName } from 'lucide-react/dynamic';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import {
  RoutineInternetAccess,
  RoutineScheduleSummary,
} from '@/features/routines';
import type { MarketplaceRoutineResponseDto } from '@/pages/install/api/useFetchMarketplaceRoutine';

interface InstallRoutineCardProps {
  routine: MarketplaceRoutineResponseDto;
  onInstall: () => void;
  isInstalling: boolean;
}

export function InstallRoutineCard({
  routine,
  onInstall,
  isInstalling,
}: Readonly<InstallRoutineCardProps>) {
  const { t } = useTranslation('install-routine');

  return (
    <Card className="w-full max-w-lg" data-testid="install-routine-card">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <RoutineIcon iconName={routine.iconName} />
        </div>
        <CardTitle className="text-xl">{routine.name}</CardTitle>
        <CardDescription>{routine.shortDescription}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">{t('detail.schedule')}</dt>
            <dd>
              <RoutineScheduleSummary schedule={routine.schedule} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('detail.internet')}</dt>
            <dd data-testid="install-routine-internet">
              {t(`detail.internetAccess.${routine.internetAccess}`)}
              {routine.internetAccess === RoutineInternetAccess.allowlist && (
                <ul className="mt-1 list-inside list-disc">
                  {routine.allowedDomains.map((domain) => (
                    <li key={domain}>{domain}</li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </dl>
        <div className="rounded-md bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            {t('detail.installNote')}
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex gap-3">
        <Button variant="outline" className="flex-1" asChild>
          <Link to="/routines">{t('action.cancel')}</Link>
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={isInstalling}
          data-testid="install-routine-confirm"
          onClick={onInstall}
        >
          {isInstalling ? t('action.installing') : t('action.install')}
        </Button>
      </CardFooter>
    </Card>
  );
}

function RoutineIcon({ iconName }: Readonly<{ iconName: string | null }>) {
  const fallback = <CalendarClock className="h-8 w-8 text-primary" />;
  if (!isIconName(iconName)) return fallback;
  return (
    <DynamicIcon
      name={iconName}
      fallback={() => fallback}
      className="h-8 w-8 text-primary"
    />
  );
}

function isIconName(name: string | null): name is IconName {
  return !!name && (iconNames as string[]).includes(name);
}
