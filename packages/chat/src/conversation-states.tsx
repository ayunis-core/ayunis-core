import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';

export function ConversationLoading() {
  const { t } = useTranslation('chat');
  return (
    <p role="status" className="p-4">
      {t('chat.conversation.loading')}
    </p>
  );
}

export function ConversationLoadError({
  onRetry,
}: Readonly<{ onRetry: () => void }>) {
  const { t } = useTranslation('chat');
  return (
    <div className="space-y-2 p-4">
      <p role="alert" className="text-sm text-destructive">
        {t('chat.conversation.loadFailed')}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        data-testid="chat-thread-retry"
      >
        {t('chat.conversation.retry')}
      </Button>
    </div>
  );
}
