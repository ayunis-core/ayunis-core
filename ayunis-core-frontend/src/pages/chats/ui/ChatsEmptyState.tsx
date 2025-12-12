import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/widgets/empty-state';
import { Button } from '@/shared/ui/shadcn/button';
import { Link } from '@tanstack/react-router';
import { MessageCircle } from 'lucide-react';

interface ChatsEmptyStateProps {
  hasFilters: boolean;
}

export default function ChatsEmptyState({ hasFilters }: ChatsEmptyStateProps) {
  const { t } = useTranslation('chats');

  if (hasFilters) {
    return (
      <EmptyState
        title={t('emptyState.noResultsTitle')}
        description={t('emptyState.noResultsDescription')}
      />
    );
  }

  return (
    <EmptyState
      title={t('emptyState.title')}
      description={t('emptyState.description')}
      action={
        <Button asChild>
          <Link to="/chat">
            <MessageCircle className="mr-2 h-4 w-4" />
            {t('emptyState.startChat')}
          </Link>
        </Button>
      }
    />
  );
}
