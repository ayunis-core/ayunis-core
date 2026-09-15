import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ayunis/ui/components/collapsible';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from '@ayunis/ui/components/sidebar';
import { useSidebarGroupOpen } from '@/features/useSidebarGroupOpen';

interface SidebarCollapsibleGroupProps {
  label: string;
  storageKey: string;
  action?: ReactNode;
  testId?: string;
  children: ReactNode;
}

export function SidebarCollapsibleGroup({
  label,
  storageKey,
  action,
  testId,
  children,
}: Readonly<SidebarCollapsibleGroupProps>) {
  const [isOpen, setOpen] = useSidebarGroupOpen(storageKey);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <SidebarGroup data-testid={testId}>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="group/label flex w-full items-center gap-1">
            <span className="truncate">{label}</span>
            <span className="flex shrink-0 translate-y-px items-center opacity-0 transition group-hover/label:opacity-100 group-focus-visible/label:opacity-100 group-data-[state=closed]/collapsible:opacity-100 group-data-[state=open]/collapsible:rotate-90">
              <ChevronRight className="size-3.5" />
            </span>
            {action && (
              <span className="ml-auto flex items-center">{action}</span>
            )}
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>{children}</SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
