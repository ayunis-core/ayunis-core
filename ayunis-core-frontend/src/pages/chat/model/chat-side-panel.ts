export type ChatSidePanelTab = 'artifacts' | 'context';

export type ChatSidePanelView = 'artifact-list' | 'artifact-detail' | 'context';

export function resolveChatSidePanelView(
  requestedView: ChatSidePanelView,
  contextEnabled: boolean,
): ChatSidePanelView {
  if (requestedView === 'context' && !contextEnabled) return 'artifact-list';
  return requestedView;
}

export function getChatSidePanelTab(view: ChatSidePanelView): ChatSidePanelTab {
  return view === 'context' ? 'context' : 'artifacts';
}
