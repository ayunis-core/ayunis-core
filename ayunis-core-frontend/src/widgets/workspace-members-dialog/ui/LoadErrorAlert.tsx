import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import {
  Alert,
  AlertAction,
  AlertDescription,
} from '@ayunis/ui/components/alert';
import { Button } from '@ayunis/ui/components/button';

export function LoadErrorAlert({
  message,
  testId,
  onRetry,
}: Readonly<{
  message: string;
  testId: string;
  onRetry: () => void;
}>) {
  const { t } = useTranslation('workspace-sharing');

  return (
    <Alert variant="destructive" data-testid={testId}>
      <AlertCircle />
      <AlertDescription>{message}</AlertDescription>
      <AlertAction>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('dialog.retry')}
        </Button>
      </AlertAction>
    </Alert>
  );
}
