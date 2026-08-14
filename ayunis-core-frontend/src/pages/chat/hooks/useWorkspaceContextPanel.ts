import { useState } from 'react';
import { useWorkspaceContextControllerFindContext } from '@/shared/api/generated/ayunisCoreAPI';
import { hasProcessingWorkspaceDocuments } from '@/shared/lib/workspace-context';
import type { WorkspaceContextPanel } from '../ui/WorkspaceContextSidePanel';

export function useWorkspaceContextPanel({
  workspaceId,
  onOpen,
}: Readonly<{
  workspaceId?: string | null;
  onOpen: () => void;
}>) {
  const [panelState, setPanelState] = useState<{
    workspaceId?: string | null;
    panel: WorkspaceContextPanel | null;
  }>({ panel: null });
  const { data: context } = useWorkspaceContextControllerFindContext(
    workspaceId ?? '',
    {
      query: {
        enabled: Boolean(workspaceId),
        staleTime: 0,

        refetchInterval: (query) =>
          hasProcessingWorkspaceDocuments(query.state.data) ? 5000 : false,
      },
    },
  );

  const panel =
    panelState.workspaceId === workspaceId ? panelState.panel : null;

  function toggle(panelToToggle: WorkspaceContextPanel) {
    setPanelState((current) => ({
      workspaceId,
      panel:
        current.workspaceId === workspaceId && current.panel === panelToToggle
          ? null
          : panelToToggle,
    }));
    onOpen();
  }

  function close() {
    setPanelState({ workspaceId, panel: null });
  }

  return {
    context,
    panel,
    toggle,
    close,
  };
}
