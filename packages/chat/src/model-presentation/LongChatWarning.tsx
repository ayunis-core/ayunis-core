import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
} from '@ayunis/ui/components/alert';

export function LongChatWarning({
  onNewChat,
}: Readonly<{ onNewChat: () => void }>) {
  const { t } = useTranslation('chat');
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  return (
    <Alert
      variant="warning"
      className="mb-2"
      data-testid="chat-long-chat-alert"
    >
      <AlertTriangle />
      <AlertTitle>{t('chat.longChatWarningTitle')}</AlertTitle>
      <AlertDescription>
        {t('chat.longChatWarningDescription')}
        <Button
          variant="outline"
          size="sm"
          onClick={onNewChat}
          className="mt-2"
        >
          {t('newChat.newChat')}
        </Button>
      </AlertDescription>
      <AlertAction className="self-start">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsDismissed(true)}
          aria-label={t('chat.longChatWarningDismiss')}
          data-testid="chat-long-chat-alert-dismiss"
        >
          <X className="size-4" />
        </Button>
      </AlertAction>
    </Alert>
  );
}
