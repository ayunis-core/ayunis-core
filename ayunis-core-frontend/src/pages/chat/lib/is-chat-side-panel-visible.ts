import type { WorkspaceContextPanel } from '@/pages/chat/ui/WorkspaceContextSidePanel';

export function isChatSidePanelVisible(
  artifactPanelOpen: boolean,
  workspacePanel: WorkspaceContextPanel | null,
  hasWorkspaceContext: boolean,
) {
  return artifactPanelOpen || Boolean(workspacePanel && hasWorkspaceContext);
}
