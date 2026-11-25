import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@ayunis/ui/components/alert';

export function UnavailableModelNotice({
  onNewChat,
}: Readonly<{ onNewChat: () => void }>) {
  const { t } = useTranslation('chat');

  return (
    <Alert variant="warning" className="mb-2">
      <AlertTriangle />
      <AlertTitle>{t('chat.modelUnavailableTitle')}</AlertTitle>
      <AlertDescription>
        {t('chat.modelUnavailableDescription')}
        <Button
          variant="outline"
          size="sm"
          onClick={onNewChat}
          className="mt-2"
        >
          {t('newChat.newChat')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
