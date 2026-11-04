import type { PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInitiateChat } from './useInitiateChat';

const mocks = vi.hoisted(() => ({
  createThread: vi.fn(),
  createSession: vi.fn(),
  complete: vi.fn(),
  abort: vi.fn(),
  transfer: vi.fn(),
  navigate: vi.fn(),
  handleError: vi.fn(),
  setPendingMessage: vi.fn(),
  setPendingImages: vi.fn(),
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useThreadsControllerCreate: () => ({
    mutateAsync: mocks.createThread,
    isPending: false,
  }),
  threadSourcesControllerCreateUpload: mocks.createSession,
  threadSourcesControllerCompleteUpload: mocks.complete,
  sourceUploadsControllerAbort: mocks.abort,
}));
vi.mock('@/shared/lib/source-upload/transfer-source-file', () => ({
  transferSourceFile: mocks.transfer,
}));
vi.mock('@/shared/lib/handle-source-upload-error', () => ({
  default: mocks.handleError,
}));
vi.mock('@/shared/contexts/chat/useChatContext', () => ({
  useChatContext: () => ({
    setPendingMessage: mocks.setPendingMessage,
    setPendingImages: mocks.setPendingImages,
  }),
}));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));

function setup() {
  const client = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useInitiateChat({ settleAnimation: false }), {
    wrapper,
  });
}
const input = {
  message: 'Review this budget',
  images: [],
  modelId: 'model-1',
  sources: [
    {
      id: 'pending-budget',
      name: 'Budget.pdf',
      type: 'text' as const,
      file: new File(['budget'], 'Budget.pdf'),
    },
  ],
  knowledgeBases: [],
  mcpIntegrations: [],
  isAnonymous: false,
};

describe('new-chat upload cleanup', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.createThread.mockResolvedValue({ id: 'new-thread' });
    mocks.createSession.mockResolvedValue({
      id: 'upload-1',
      multipart: false,
      partSizeBytes: 8 * 1024 * 1024,
      expiresAt: '2026-11-05T20:00:00Z',
    });
    mocks.abort.mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('aborts a reserved session when transfer fails', async () => {
    const original = new Error('transfer failed');
    mocks.transfer.mockRejectedValue(original);
    const { result } = setup();
    await act(async () => result.current.initiateChat(input));
    expect(mocks.abort).toHaveBeenCalledWith('upload-1');
    expect(mocks.handleError).toHaveBeenCalledWith(
      original,
      expect.any(Function),
    );
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('uses an independent cleanup request after the upload signal expires', async () => {
    const controller = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    const original = new DOMException('Upload timed out', 'TimeoutError');
    mocks.transfer.mockImplementation(async () => {
      controller.abort(original);
      throw original;
    });
    mocks.abort.mockRejectedValue(new Error('cleanup unavailable'));
    const { result } = setup();
    await act(async () => result.current.initiateChat(input));
    expect(mocks.abort).toHaveBeenCalledWith('upload-1');
    expect(mocks.handleError).toHaveBeenCalledWith(
      original,
      expect.any(Function),
    );
  });

  it('does not abort when session creation fails before an ID is known', async () => {
    mocks.createSession.mockRejectedValue(new Error('session rejected'));
    const { result } = setup();
    await act(async () => result.current.initiateChat(input));
    expect(mocks.abort).not.toHaveBeenCalled();
  });
});
