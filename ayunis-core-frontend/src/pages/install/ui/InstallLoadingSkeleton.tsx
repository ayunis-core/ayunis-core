import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@ayunis/ui/components/card';
import { Skeleton } from '@ayunis/ui/components/skeleton';

export function InstallLoadingSkeleton() {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <Skeleton className="mx-auto mb-4 h-16 w-16 rounded-full" />
        <Skeleton className="mx-auto h-6 w-48" />
        <Skeleton className="mx-auto mt-2 h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-16 w-full" />
      </CardContent>
      <CardFooter className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </CardFooter>
    </Card>
  );
}
