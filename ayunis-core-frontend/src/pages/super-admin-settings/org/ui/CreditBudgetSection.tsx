import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import { Progress } from '@/shared/ui/shadcn/progress';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useSuperAdminCreditUsage from '../api/useSuperAdminCreditUsage';

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
  const usagePercent =
    monthlyCredits > 0
      ? Math.min(100, Math.round((creditsUsed / monthlyCredits) * 100))
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t('creditBudget.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t('creditBudget.error')}</AlertDescription>
          </Alert>
        )}
        {!isError && isLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
            <Skeleton className="h-2 rounded-full" />
          </div>
        )}
        {!isError && !isLoading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {t('creditBudget.budget')}
                </span>
                <Badge variant="outline">
                  {monthlyCredits.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {t('creditBudget.used')}
                </span>
                <Badge variant="outline">{creditsUsed.toLocaleString()}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {t('creditBudget.remaining')}
                </span>
                <Badge variant="outline">
                  {creditsRemaining.toLocaleString()}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('creditBudget.usageProgress')}</span>
                <span>{usagePercent}%</span>
              </div>
              <Progress value={usagePercent} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
