import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { WebConversationComposer } from './WebConversationComposer';

const inputCapture = vi.hoisted<{ props: unknown }>(() => ({
  props: undefined,
}));

vi.mock('@/widgets/chat-input', () => ({
  default: (props: unknown) => {
    inputCapture.props = props;
    return null;
  },
  getChatInputSubmissionState: () => 'idle',
}));

vi.mock('@/pages/chat/hooks/usePendingMessage', () => ({
  usePendingMessage: () => undefined,
}));

vi.mock('@/features/thread-run', () => ({
  cancelDeferredThreadRun: () => false,
  deferThreadRun: vi.fn(),
  useIsThreadRunDeferred: () => false,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/pages/chat/ui/LongChatWarning', () => ({ default: () => null }));
vi.mock('@/pages/chat/ui/UnavailableModelNotice', () => ({
  default: () => null,
}));
vi.mock('@/pages/chat/ui/ProviderFaultNotice', () => ({
  default: () => null,
}));
vi.mock('@/widgets/academy-gate-notice', () => ({
  AcademyGateNotice: () => null,
}));

type ComposerProps = ComponentProps<typeof WebConversationComposer>;

function composerProps(): ComposerProps {
  return {
    thread: {
      id: 'thread-id',
      messages: [],
      piiMasks: [],
      knowledgeBases: [],
      mcpIntegrations: [],
    } as unknown as ComposerProps['thread'],
    controller: {
      messages: [],
      piiMasks: [],
      isStreaming: false,
      isCheckingForRun: true,
      isRunCancellable: false,
      send: vi.fn(async () => undefined),
      resumeStartedRun: vi.fn(() => false),
      stop: vi.fn(),
    },
    inputRef: {
      current: { setMessage: vi.fn() },
    } as unknown as ComposerProps['inputRef'],
    submission: {
      pendingSubmission: null,
      startSubmission: vi.fn(),
    } as unknown as ComposerProps['submission'],
    files: {
      files: [],
      processingSteps: [],
      isUploading: false,
      upload: vi.fn(),
      remove: vi.fn(),
    },
    hasProcessingSources: false,
    isAcademyGated: false,
    isEmbeddingModelEnabled: true,
    isModelUnavailable: false,
    addKnowledgeBase: vi.fn(),
    removeKnowledgeBase: vi.fn(),
    addIntegration: vi.fn(),
    removeIntegration: vi.fn(),
  };
}

describe('WebConversationComposer', () => {
  it('does not clear or submit a draft while active runs are being checked', () => {
    const props = composerProps();
    render(<WebConversationComposer {...props} />);
    const input = inputCapture.props as {
      readonly isSendDisabled: boolean;
      readonly onSend: (text: string) => void;
    };

    expect(input.isSendDisabled).toBe(true);
    act(() => input.onSend('Keep this draft'));

    expect(props.submission.startSubmission).not.toHaveBeenCalled();
    expect(props.inputRef.current?.setMessage).not.toHaveBeenCalled();
    expect(props.controller.send).not.toHaveBeenCalled();
  });
});
