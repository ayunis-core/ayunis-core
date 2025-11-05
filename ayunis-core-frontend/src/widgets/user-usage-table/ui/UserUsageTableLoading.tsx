import { Skeleton } from "@/shared/ui/shadcn/skeleton";

export function UserUsageTableLoading() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

