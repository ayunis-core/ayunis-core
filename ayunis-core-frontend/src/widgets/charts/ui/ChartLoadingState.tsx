// Utils
import { cn } from "@/shared/lib/shadcn/utils";

export function ChartLoadingState() {
  return (
    <div
      className={cn(
        "my-2 w-full h-64 bg-muted animate-pulse rounded-lg"
      )}
    />
  );
}

