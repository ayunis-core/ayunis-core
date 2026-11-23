import { useTranslation } from 'react-i18next';
import { AlertCircle, CircleCheck, ShieldAlert } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';
import {
  SharePointResolutionOutcome,
  type SharePointGrantResponseDto,
  type SharePointLocationResolutionResponseDto,
} from '@ayunis/api-client/schemas';
import { CopyButton } from '@/shared/ui/copy-button';

export function SharePointResolutionResult({
  result,
}: Readonly<{ result: SharePointLocationResolutionResponseDto }>) {
  return (
    <div
      data-testid="sharepoint-location-resolution"
      data-outcome={result.outcome}
    >
      <ResolutionOutcome result={result} />
    </div>
  );
}

function ResolutionOutcome({
  result,
}: Readonly<{ result: SharePointLocationResolutionResponseDto }>) {
  const { t } = useTranslation('knowledge-bases');
  const prefix = 'detail.syncedLocations.resolution';
  if (result.outcome === SharePointResolutionOutcome.found)
    return (
      <Alert>
        <CircleCheck />
        <AlertTitle>
          {t(`${prefix}.found.${result.kind ?? 'folder'}`, {
            name: result.name,
          })}
        </AlertTitle>
        <AlertDescription>{t(`${prefix}.found.description`)}</AlertDescription>
      </Alert>
    );
  if (result.grant)
    return <NotGranted outcome={result.outcome} grant={result.grant} />;
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>{t(`${prefix}.${result.outcome}.title`)}</AlertTitle>
      <AlertDescription>
        {t(`${prefix}.${result.outcome}.description`)}
      </AlertDescription>
    </Alert>
  );
}

function NotGranted({
  outcome,
  grant,
}: Readonly<{
  outcome: SharePointResolutionOutcome;
  grant: SharePointGrantResponseDto;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const prefix = `detail.syncedLocations.resolution.${outcome}`;
  return (
    <Alert variant="warning">
      <ShieldAlert />
      <AlertTitle>{t(`${prefix}.title`)}</AlertTitle>
      <AlertDescription>
        <p>{t(`${prefix}.description`)}</p>
        <div className="flex w-full min-w-0 items-start gap-1 rounded-md border bg-muted p-2 text-foreground">
          <pre
            className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs"
            data-testid="sharepoint-location-grant-command"
          >
            {grant.command}
          </pre>
          <CopyButton
            value={grant.command}
            label={t('detail.syncedLocations.resolution.commandLabel')}
            testId="sharepoint-location-grant-copy"
          />
        </div>
      </AlertDescription>
    </Alert>
  );
}
