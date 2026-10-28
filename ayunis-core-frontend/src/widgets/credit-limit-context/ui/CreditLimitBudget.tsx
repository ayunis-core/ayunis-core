import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Button } from '@ayunis/ui/components/button';
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
        <CardAction>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin-settings/usage">{t('budget.manage')}</Link>
          </Button>
        </CardAction>
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
      </CardContent>
    </Card>
  );
}
