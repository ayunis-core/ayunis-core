import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { CreditBudgetDisplay } from '@/widgets/credit-budget-display';
import { useCreditLimitBudget } from '@/features/credit-limits/api/useCreditLimitQueries';

export function CreditLimitBudget() {
  const { t } = useTranslation('admin-settings-credit-limits');
  const query = useCreditLimitBudget();
  const monthlyCredits = query.data?.monthlyCredits ?? 0;
  const creditsUsed = query.data?.creditsUsed ?? 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('budget.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CreditBudgetDisplay
          monthlyCredits={monthlyCredits}
          creditsUsed={creditsUsed}
          creditsRemaining={query.data?.creditsRemaining ?? 0}
          usagePercent={
            monthlyCredits > 0
              ? Math.round((creditsUsed / monthlyCredits) * 100)
              : 0
          }
          isLoading={query.isPending}
          isError={query.isError}
          hasBudget={query.hasBudget}
          labels={{
            error: t('states.error'),
            budget: t('budget.monthly'),
            used: t('budget.used'),
            remaining: t('budget.remaining'),
            usageProgress: t('budget.progress'),
          }}
        />
        <Link to="/admin-settings/usage" className="text-sm underline">
          {t('budget.manage')}
        </Link>
      </CardContent>
    </Card>
  );
}
