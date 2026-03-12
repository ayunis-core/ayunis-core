import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { CreditBudgetDisplay } from '@/widgets/credit-budget-display';
import { useTranslation } from 'react-i18next';
import { useCreditUsage } from '../api/useCreditUsage';

export function CreditUsageCard() {
  const { t } = useTranslation('admin-settings-usage');
  const {
    monthlyCredits,
    creditsUsed,
    creditsRemaining,
    usagePercent,
    hasSubscription,
    isLoading,
    isError,
  } = useCreditUsage();

  if (!hasSubscription && !isLoading && !isError) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('creditUsage.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CreditBudgetDisplay
          monthlyCredits={monthlyCredits}
          creditsUsed={creditsUsed}
          creditsRemaining={creditsRemaining}
          usagePercent={usagePercent}
          isLoading={isLoading}
          isError={isError}
          labels={{
            error: t('creditUsage.error'),
            budget: t('creditUsage.budget'),
            used: t('creditUsage.used'),
            remaining: t('creditUsage.remaining'),
            usageProgress: t('creditUsage.usageProgress'),
          }}
        />
      </CardContent>
    </Card>
  );
}
