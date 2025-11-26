import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';

interface Props {
  onReset: () => void;
}

export function ErrorFallback({ onReset }: Props) {
  const { t } = useTranslation('common');

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">{t('error.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('error.description')}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleReload}>{t('error.reloadPage')}</Button>
        <Button variant="outline" onClick={onReset}>
          {t('error.tryAgain')}
        </Button>
      </div>
    </div>
  );
}
