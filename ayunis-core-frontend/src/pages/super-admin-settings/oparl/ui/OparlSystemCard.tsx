import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import type {
  OparlObjectCountsDto,
  OparlSystemResponseDto,
} from '@ayunis/api-client';
import { OparlSystemHealth } from '@ayunis/api-client';
import { useSyncOparlSystemNow } from '@/pages/super-admin-settings/oparl/api/useSyncOparlSystemNow';
import { OparlDocumentStats } from './OparlDocumentStats';

const COUNT_KEYS: Array<keyof OparlObjectCountsDto> = [
  'body',
  'legislativeTerm',
  'organization',
  'person',
  'membership',
  'meeting',
  'agendaItem',
  'paper',
  'consultation',
  'file',
  'location',
];

const HEALTH_VARIANTS: Record<
  OparlSystemHealth,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  [OparlSystemHealth.pending]: 'outline',
  [OparlSystemHealth.healthy]: 'secondary',
  [OparlSystemHealth.suspicious]: 'default',
  [OparlSystemHealth.failing]: 'destructive',
};

function formatDateTime(value: string | null, language: string): string {
  return value ? new Date(value).toLocaleString(language) : '—';
}

function title(system: OparlSystemResponseDto): string {
  const onlyBody = system.bodies.length === 1 ? system.bodies[0] : null;
  return onlyBody?.name ?? system.name ?? system.url;
}

export function OparlSystemCard({
  system,
}: Readonly<{ system: OparlSystemResponseDto }>) {
  const { t, i18n } = useTranslation('super-admin-settings-oparl');
  const { syncNow, isPending } = useSyncOparlSystemNow();
  const date = (value: string | null) => formatDateTime(value, i18n.language);

  return (
    <Card data-testid="oparl-system">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title(system)}
          <Badge variant={HEALTH_VARIANTS[system.health]}>
            {t(`health.${system.health}`)}
          </Badge>
        </CardTitle>
        <CardDescription className="break-all">{system.url}</CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            disabled={isPending || system.running !== null}
            onClick={() => syncNow(system.id)}
            data-testid="oparl-sync-now"
          >
            {system.running ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {system.running ? t('sync.running') : t('sync.now')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {system.lastError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="break-all">
              {system.lastError}
            </AlertDescription>
          </Alert>
        )}
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">{t('fields.bodies')}</dt>
          <dd>
            {system.bodies
              .map((body) => body.name ?? body.oparlId)
              .join(', ') || '—'}
          </dd>
          <dt className="text-muted-foreground">{t('fields.system')}</dt>
          <dd>
            {[system.name, system.vendor, system.oparlVersion]
              .filter(Boolean)
              .join(' · ') || '—'}
          </dd>
          {system.running && (
            <>
              <dt className="text-muted-foreground">{t('fields.running')}</dt>
              <dd>
                {t(`kind.${system.running.kind}`)} ·{' '}
                {date(system.running.startedAt)}
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">{t('fields.lastDelta')}</dt>
          <dd>{date(system.lastDeltaSyncAt)}</dd>
          <dt className="text-muted-foreground">{t('fields.lastFull')}</dt>
          <dd>{date(system.lastFullSyncAt)}</dd>
          <dt className="text-muted-foreground">{t('fields.nextSync')}</dt>
          <dd>{date(system.nextSyncAt)}</dd>
        </dl>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {COUNT_KEYS.map((key) => (
            <div key={key} className="min-w-0 rounded-md border p-2">
              <dt className="truncate text-xs text-muted-foreground">
                {t(`counts.${key}`)}
              </dt>
              <dd className="font-medium tabular-nums">
                {system.counts[key].toLocaleString(i18n.language)}
              </dd>
            </div>
          ))}
        </dl>
        <OparlDocumentStats documents={system.documents} />
      </CardContent>
    </Card>
  );
}
