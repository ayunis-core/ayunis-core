import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/shared/ui/shadcn/button';
import { Alert, AlertTitle, AlertDescription } from '@/shared/ui/shadcn/alert';

export default function UnavailableModelNotice() {
  const { t } = useTranslation('chat');
  const navigate = useNavigate();

  function handleNewChat() {
    void navigate({ to: '/chat' });
  }

  return (
    <Alert variant="warning" className="mb-2">
      <AlertTriangle />
      <AlertTitle>{t('chat.modelUnavailableTitle')}</AlertTitle>
      <AlertDescription>
        {t('chat.modelUnavailableDescription')}
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewChat}
          className="mt-2"
        >
          {t('newChat.newChat')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
