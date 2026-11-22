import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import {
  OutlookToolBridgeContext,
  type OutlookToolBridge,
} from '@/pages/chat/model/outlook-tool-bridge';
import OutlookDraftWidget from './OutlookDraftWidget';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const draft: ToolUseMessageContent = {
  type: 'tool_use',
  id: 'call-1',
  name: 'outlook__draft_email',
  params: { body: 'Dear Bob' },
};

function renderWidget(
  action: ReturnType<OutlookToolBridge['draftAction']>,
  { isStreaming = false } = {},
) {
  const bridge: OutlookToolBridge = {
    stateFor: () => undefined,
    draftAction: () => action,
    insertDraft: vi.fn(),
    openReply: vi.fn(),
  };
  render(
    <OutlookToolBridgeContext.Provider value={bridge}>
      <OutlookDraftWidget content={draft} isStreaming={isStreaming} />
    </OutlookToolBridgeContext.Provider>,
  );
  return bridge;
}

const replyButtons = () => [
  ...screen.queryAllByTestId('outlook-draft-reply-all'),
  ...screen.queryAllByTestId('outlook-draft-reply'),
];

describe('OutlookDraftWidget', () => {
  it.each([
    ['outlook-draft-reply-all', 'all'],
    ['outlook-draft-reply', 'sender'],
  ] as const)('%s opens the %s reply with this draft', (testId, recipients) => {
    const bridge = renderWidget('reply');

    fireEvent.click(screen.getByTestId(testId));

    expect(bridge.openReply).toHaveBeenCalledExactlyOnceWith(
      { id: 'call-1', name: 'outlook__draft_email', params: draft.params },
      recipients,
    );
  });

  it('offers no reply while the draft is still streaming', () => {
    renderWidget('reply', { isStreaming: true });

    expect(replyButtons()).toHaveLength(0);
  });

  it.each([null, 'insert'] as const)(
    'offers no reply when the bridge offers %s',
    (action) => {
      renderWidget(action);

      expect(replyButtons()).toHaveLength(0);
    },
  );
});
