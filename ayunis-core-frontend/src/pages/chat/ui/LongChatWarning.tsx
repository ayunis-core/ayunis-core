import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@ayunis/ui/components/button';
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
} from '@ayunis/ui/components/alert';

export default function LongChatWarning() {
  const { t } = useTranslation('chat');
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  function handleNewChat() {
    void navigate({ to: '/chat' });
  }

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
          onClick={handleNewChat}
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
