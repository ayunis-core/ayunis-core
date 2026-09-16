import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { CollapsibleTrigger } from '@ayunis/ui/components/collapsible';
import { SidebarMenuAction } from '@ayunis/ui/components/sidebar';

interface WorkspaceChatsToggleProps {
  workspaceId: string;
}

export function WorkspaceChatsToggle({
  workspaceId,
}: Readonly<WorkspaceChatsToggleProps>) {
  const { t } = useTranslation('common');

  return (
    <CollapsibleTrigger asChild>
      <SidebarMenuAction
        showOnHover
        className="right-7"
        data-testid={`sidebar-workspace-toggle-${workspaceId}`}
      >
        <ChevronRight className="transition-transform group-data-[state=open]/workspace:rotate-90" />
        <span className="sr-only">{t('sidebar.workspaceChats')}</span>
      </SidebarMenuAction>
    </CollapsibleTrigger>
  );
}
