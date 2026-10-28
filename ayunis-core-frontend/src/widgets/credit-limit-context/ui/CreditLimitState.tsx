import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';

interface CreditLimitStateProps {
  isError: boolean;
  isPending: boolean;
  unavailable?: boolean;
  onRetry?: () => void;
  children: ReactNode;
}

export function CreditLimitState({
  isError,
  isPending,
  unavailable,
  onRetry,
  children,
}: Readonly<CreditLimitStateProps>) {
  const { t } = useTranslation('admin-settings-credit-limits');
  if (isError)
    return (
      <div role="alert" className="space-y-2">
        <p>{t('states.error')}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            {t('states.retry')}
          </Button>
        )}
      </div>
    );
  if (isPending) return <p role="status">{t('states.loading')}</p>;
  if (unavailable) return <p role="status">{t('states.unavailable')}</p>;
  return <>{children}</>;
}
