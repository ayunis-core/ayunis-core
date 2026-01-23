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

export default function UnavailableAgentWarning() {
  const { t } = useTranslation('chat');
  const navigate = useNavigate();

  function handleNewChat() {
    void navigate({ to: '/chat' });
  }

  return (
    <Item
      variant="muted"
      size="sm"
      className="mx-4 mb-2 border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950"
    >
      <ItemMedia>
        <AlertTriangle className="h-4 w-4 text-orange-700 dark:text-orange-400" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="text-orange-700 dark:text-orange-400">
          {t('chat.unavailableAgentWarningTitle')}
        </ItemTitle>
        <ItemDescription className="text-orange-700 dark:text-orange-400">
          {t('chat.unavailableAgentWarningDescription')}
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
