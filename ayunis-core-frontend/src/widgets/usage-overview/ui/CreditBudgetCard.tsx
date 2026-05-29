import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { CreditBudgetDisplay } from '@/widgets/credit-budget-display';
import { useTranslation } from 'react-i18next';
import type { CreditUsageView } from '../model/types';

interface CreditBudgetCardProps {
  creditUsage: CreditUsageView;
}

/**
 * Credit budget summary for the current calendar month. Independent of the
 * month picker — always reflects the current month. When the org has no
 * usage-based subscription, only credits used are shown.
 */
export function CreditBudgetCard({
  creditUsage,
}: Readonly<CreditBudgetCardProps>) {
  const { t } = useTranslation('admin-settings-usage');
  const {
    monthlyCredits,
    creditsUsed,
    creditsRemaining,
    usagePercent,
    hasSubscription,
    isLoading,
    isError,
  } = creditUsage;

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
          hasBudget={hasSubscription}
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
