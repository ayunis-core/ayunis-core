import { AlertCircle } from 'lucide-react';
import {
  Alert,
  AlertAction,
  AlertDescription,
} from '@ayunis/ui/components/alert';
import { Button } from '@ayunis/ui/components/button';

export function LoadErrorAlert({
  message,
  retryLabel,
  testId,
  onRetry,
}: Readonly<{
  message: string;
  retryLabel: string;
  testId: string;
  onRetry: () => void;
}>) {
  return (
    <Alert variant="destructive" data-testid={testId}>
      <AlertCircle />
      <AlertDescription>{message}</AlertDescription>
      <AlertAction>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      </AlertAction>
    </Alert>
  );
}
