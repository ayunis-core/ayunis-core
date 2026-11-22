import { useTranslation } from 'react-i18next';
import { AlertCircle, CircleCheck, CircleX } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';
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
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import {
  Microsoft365ConnectionTestOutcome,
  type Microsoft365ConnectionTestResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showsPermissions } from '@/pages/admin-settings/microsoft-365-connector/lib/microsoft-365-connection-test';

interface Microsoft365ConnectionTestCardProps {
  result: Microsoft365ConnectionTestResponseDto | null;
  onTest: () => void;
  isTesting: boolean;
}

export function Microsoft365ConnectionTestCard({
  result,
  onTest,
  isTesting,
}: Readonly<Microsoft365ConnectionTestCardProps>) {
  const { t } = useTranslation('admin-settings-connections');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('microsoft365.test.title')}</CardTitle>
        <CardDescription>{t('microsoft365.test.description')}</CardDescription>
        <CardAction>
          <Button
            variant="outline"
            onClick={onTest}
            disabled={isTesting}
            data-testid="microsoft-365-connector-test"
          >
            {isTesting
              ? t('microsoft365.test.testing')
              : t('microsoft365.test.button')}
          </Button>
        </CardAction>
      </CardHeader>
      {result && (
        <CardContent className="space-y-4">
          <TestOutcome result={result} />
          {showsPermissions(result.outcome) && (
            <GrantedPermissions result={result} />
          )}
        </CardContent>
      )}
    </Card>
  );
}

function TestOutcome({
  result,
}: Readonly<{ result: Microsoft365ConnectionTestResponseDto }>) {
  const { t } = useTranslation('admin-settings-connections');
  const connected =
    result.outcome === Microsoft365ConnectionTestOutcome.connected;
  const outcome = `microsoft365.test.outcomes.${result.outcome}`;

  return (
    <Alert
      variant={connected ? 'default' : 'destructive'}
      data-testid="microsoft-365-connection-test-result"
      data-outcome={result.outcome}
    >
      {connected ? <CircleCheck /> : <AlertCircle />}
      <AlertTitle>{t(`${outcome}.title`)}</AlertTitle>
      <AlertDescription>
        <p>{t(`${outcome}.hint`)}</p>
        {result.entraErrorCode && (
          <p>
            {t('microsoft365.test.entraErrorCode', {
              code: result.entraErrorCode,
            })}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}

function GrantedPermissions({
  result,
}: Readonly<{ result: Microsoft365ConnectionTestResponseDto }>) {
  const { t } = useTranslation('admin-settings-connections');

  return (
    <ItemGroup className="gap-2">
      {result.permissions.map((permission) => (
        <Item
          key={permission.name}
          variant="outline"
          size="sm"
          data-testid={`microsoft-365-connection-test-permission-${permission.name}`}
          data-granted={permission.granted}
        >
          <ItemMedia
            className={
              permission.granted ? 'text-brand' : 'text-muted-foreground'
            }
          >
            {permission.granted ? <CircleCheck /> : <CircleX />}
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{permission.name}</ItemTitle>
          </ItemContent>
          <ItemActions>
            <Badge variant={permission.required ? 'default' : 'secondary'}>
              {permission.required
                ? t('microsoft365.test.required')
                : t('microsoft365.test.optional')}
            </Badge>
            <span className="text-muted-foreground">
              {permission.granted
                ? t('microsoft365.test.granted')
                : t('microsoft365.test.notGranted')}
            </span>
          </ItemActions>
        </Item>
      ))}
      {result.otherGrantedPermissions.length > 0 && (
        <p
          className="text-sm text-muted-foreground"
          data-testid="microsoft-365-connection-test-other-permissions"
        >
          {t('microsoft365.test.otherGranted', {
            permissions: result.otherGrantedPermissions.join(', '),
          })}
        </p>
      )}
    </ItemGroup>
  );
}
