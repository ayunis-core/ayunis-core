export type ChatSidePanelTab = 'artifacts' | 'context';

export type ChatSidePanelView = 'artifact-list' | 'artifact-detail' | 'context';

export function getChatSidePanelTab(view: ChatSidePanelView): ChatSidePanelTab {
  return view === 'context' ? 'context' : 'artifacts';
}
