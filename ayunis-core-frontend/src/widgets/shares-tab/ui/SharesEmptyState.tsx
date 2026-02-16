import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/widgets/empty-state';
import { Button } from '@/shared/ui/shadcn/button';
import { Share2 } from 'lucide-react';

interface SharesEmptyStateProps {
  translationNs: string;
  onCreateClick: () => void;
}

export default function SharesEmptyState({
  translationNs,
  onCreateClick,
}: SharesEmptyStateProps) {
  const { t } = useTranslation(translationNs);

  return (
    <EmptyState
      title={t('shares.empty.title')}
      description={t('shares.empty.description')}
      action={
        <Button onClick={onCreateClick}>
          <Share2 className="mr-2 h-4 w-4" />
          {t('shares.empty.button')}
        </Button>
      }
    />
  );
}
