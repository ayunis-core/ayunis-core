import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function PagePending() {
  const { t } = useTranslation('common');

  return (
    <div
      role="status"
      data-testid="page-pending"
      className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 p-4 text-center"
    >
      <LoaderCircle
        aria-hidden="true"
        className="h-10 w-10 animate-spin text-muted-foreground"
      />
      <p className="font-medium">{t('common.pagePending.title')}</p>
      <p className="text-sm text-muted-foreground">
        {t('common.pagePending.description')}
      </p>
    </div>
  );
}
