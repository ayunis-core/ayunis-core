import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Link } from '@tanstack/react-router';
import { MessageCircle } from 'lucide-react';
import { ChatHistoryEmptyState } from '@ayunis/chat/history';

interface ChatsEmptyStateProps {
  hasFilters: boolean;
}

export default function ChatsEmptyState({
  hasFilters,
}: Readonly<ChatsEmptyStateProps>) {
  const { t } = useTranslation('chats');

  if (hasFilters) {
    return (
      <ChatHistoryEmptyState
        title={t('emptyState.noResultsTitle')}
        description={t('emptyState.noResultsDescription')}
      />
    );
  }

  return (
    <ChatHistoryEmptyState
      title={t('emptyState.title')}
      description={t('emptyState.description')}
      action={
        <Button asChild>
          <Link to="/chat">
            <MessageCircle />
            {t('emptyState.startChat')}
          </Link>
        </Button>
      }
    />
  );
}
