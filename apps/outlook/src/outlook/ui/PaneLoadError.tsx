import { Button } from '@ayunis/ui/components/button';
import { useTranslation } from 'react-i18next';

export function PaneLoadError({
  onRetry,
  testId,
}: Readonly<{
  onRetry: () => void;
  testId?: string;
}>) {
  const { t } = useTranslation('outlook');
  return (
    <div className="space-y-2 p-4">
      <p role="alert" className="text-sm text-destructive">
        {t('chat.requestFailed')}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        data-testid={testId}
      >
        {t('chat.retry')}
      </Button>
    </div>
  );
}
