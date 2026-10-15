import { Skeleton } from '@ayunis/ui/components/skeleton';

export function SectionLoading({ testId }: Readonly<{ testId: string }>) {
  return (
    <div className="space-y-2" data-testid={testId}>
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );
}
