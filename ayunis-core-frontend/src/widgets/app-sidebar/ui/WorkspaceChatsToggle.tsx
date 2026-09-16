import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { CollapsibleTrigger } from '@ayunis/ui/components/collapsible';

interface WorkspaceChatsToggleProps {
  workspaceId: string;
}

export function WorkspaceChatsToggle({
  workspaceId,
}: Readonly<WorkspaceChatsToggleProps>) {
  const { t } = useTranslation('common');

  return (
    <CollapsibleTrigger asChild>
      <button
        type="button"
        className="text-sidebar-foreground/70 hover:text-sidebar-foreground relative flex size-4 shrink-0 items-center justify-center rounded-sm opacity-0 transition focus-visible:opacity-100 group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100"
        data-testid={`sidebar-workspace-toggle-${workspaceId}`}
      >
        <ChevronRight className="size-3.5 transition-transform group-data-[state=open]/workspace:rotate-90" />
        <span className="sr-only">{t('sidebar.workspaceChats')}</span>
      </button>
    </CollapsibleTrigger>
  );
}
