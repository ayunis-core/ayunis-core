import { Badge } from '@/shared/ui/shadcn/badge';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemActions,
} from '@/shared/ui/shadcn/item';
import { Progress } from '@/shared/ui/shadcn/progress';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { AlertCircle } from 'lucide-react';

interface CreditBudgetDisplayProps {
  monthlyCredits: number;
  creditsUsed: number;
  creditsRemaining: number;
  usagePercent: number;
  isLoading: boolean;
  isError: boolean;
  labels: {
    error: string;
    budget: string;
    used: string;
    remaining: string;
    usageProgress: string;
  };
}

export function CreditBudgetDisplay({
  monthlyCredits,
  creditsUsed,
  creditsRemaining,
  usagePercent,
  isLoading,
  isError,
  labels,
}: Readonly<CreditBudgetDisplayProps>) {
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{labels.error}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
        <Skeleton className="h-2 rounded-full" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Item variant="muted" size="sm">
          <ItemContent>
            <ItemTitle>{labels.budget}</ItemTitle>
          </ItemContent>
          <ItemActions>
            <Badge variant="outline">
              {Math.round(monthlyCredits).toLocaleString()}
            </Badge>
          </ItemActions>
        </Item>
        <Item variant="muted" size="sm">
          <ItemContent>
            <ItemTitle>{labels.used}</ItemTitle>
          </ItemContent>
          <ItemActions>
            <Badge variant="outline">
              {Math.round(creditsUsed).toLocaleString()}
            </Badge>
          </ItemActions>
        </Item>
        <Item variant="muted" size="sm">
          <ItemContent>
            <ItemTitle>{labels.remaining}</ItemTitle>
          </ItemContent>
          <ItemActions>
            <Badge variant="outline">
              {Math.round(creditsRemaining).toLocaleString()}
            </Badge>
          </ItemActions>
        </Item>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{labels.usageProgress}</span>
          <span>{usagePercent}%</span>
        </div>
        <Progress value={usagePercent} />
      </div>
    </>
  );
}
