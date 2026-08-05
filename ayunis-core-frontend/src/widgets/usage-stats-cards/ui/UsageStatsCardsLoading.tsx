import { Skeleton } from '@ayunis/ui/components/skeleton';
import { Card, CardHeader, CardContent } from '@ayunis/ui/components/card';

export function UsageStatsCardsLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
