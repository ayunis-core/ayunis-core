import { useState } from 'react';
import { useWorkspaceContextControllerFindContext } from '@/shared/api/generated/ayunisCoreAPI';
import type { WorkspaceContextPanel } from '../ui/WorkspaceContextSidePanel';

export function useWorkspaceContextPanel({
  workspaceId,
  onOpen,
}: Readonly<{
  workspaceId?: string | null;
  onOpen: () => void;
}>) {
  const [panel, setPanel] = useState<WorkspaceContextPanel | null>(null);
  const { data: context } = useWorkspaceContextControllerFindContext(
    workspaceId ?? '',
    { query: { enabled: Boolean(workspaceId) } },
  );

  function toggle(panelToToggle: WorkspaceContextPanel) {
    setPanel((current) => (current === panelToToggle ? null : panelToToggle));
    onOpen();
  }

  function close() {
    setPanel(null);
  }

  return {
    context,
    panel,
    toggle,
    close,
  };
}
