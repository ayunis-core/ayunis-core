import type { LucideIcon } from 'lucide-react';
import { Separator } from '@ayunis/ui/components/separator';

interface EmptyStateSectionHeadingProps {
  icon: LucideIcon;
  children: string;
}

export function EmptyStateSectionHeading({
  icon: Icon,
  children,
}: Readonly<EmptyStateSectionHeadingProps>) {
  return (
    <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground">
      <div className="flex-1">
        <Separator />
      </div>
      <span className="flex items-center gap-1.5">
        <Icon className="size-4 text-brand" />
        {children}
      </span>
      <div className="flex-1">
        <Separator />
      </div>
    </div>
  );
}
