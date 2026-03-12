import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { CreditBudgetDisplay } from '@/widgets/credit-budget-display';
import { useTranslation } from 'react-i18next';
import useSuperAdminCreditUsage from '../api/useSuperAdminCreditUsage';
import { computeUsagePercent } from '@/shared/lib/computeUsagePercent';

interface CreditBudgetSectionProps {
  orgId: string;
  monthlyCredits: number;
}

export default function CreditBudgetSection({
  orgId,
  monthlyCredits,
}: Readonly<CreditBudgetSectionProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const { creditUsage, isLoading, isError } = useSuperAdminCreditUsage({
    orgId,
  });

  const creditsUsed = creditUsage?.creditsUsed ?? 0;
  const creditsRemaining = Math.max(0, monthlyCredits - creditsUsed);
  const usagePercent = computeUsagePercent(creditsUsed, monthlyCredits);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t('creditBudget.title')}
        </CardTitle>
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
            error: t('creditBudget.error'),
            budget: t('creditBudget.budget'),
            used: t('creditBudget.used'),
            remaining: t('creditBudget.remaining'),
            usageProgress: t('creditBudget.usageProgress'),
          }}
        />
      </CardContent>
    </Card>
  );
}
