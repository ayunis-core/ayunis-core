import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from '@/shared/ui/shadcn/item';

export default function LongChatWarning() {
  const { t } = useTranslation('chat');
  const navigate = useNavigate();

  function handleNewChat() {
    void navigate({ to: '/chat' });
  }

  return (
    <Item
      variant="muted"
      size="sm"
      className="mx-4 mb-2 border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950"
    >
      <ItemMedia>
        <AlertTriangle className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="text-yellow-700 dark:text-yellow-400">
          {t('chat.longChatWarningTitle')}
        </ItemTitle>
        <ItemDescription className="text-yellow-700 dark:text-yellow-400">
          {t('chat.longChatWarningDescription')}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button variant="outline" size="sm" onClick={handleNewChat}>
          {t('newChat.newChat')}
        </Button>
      </ItemActions>
    </Item>
  );
}
