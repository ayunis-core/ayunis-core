import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatContext } from '@/shared/contexts/chat/chatContext';
import { usePendingMessage } from './usePendingMessage';

function renderWithPending(pending: {
  message: string;
  images: Array<{ file: File; altText?: string }>;
}) {
  const sendTextMessage = vi.fn().mockResolvedValue(undefined);
  const contextValue = {
    pendingMessage: pending.message,
    setPendingMessage: vi.fn(),
    pendingImages: pending.images,
    setPendingImages: vi.fn(),
    pendingSkillId: undefined,
    setPendingSkillId: vi.fn(),
  };
  renderHook(() => usePendingMessage({ sendTextMessage }), {
    wrapper: ({ children }) => (
      <ChatContext.Provider value={contextValue}>
        {children}
      </ChatContext.Provider>
    ),
  });
  return { sendTextMessage, contextValue };
}

describe(usePendingMessage.name, () => {
  it('sends a pending image without text', async () => {
    const file = new File(['png'], 'screenshot.png', { type: 'image/png' });

    const { sendTextMessage, contextValue } = renderWithPending({
      message: '',
      images: [{ file }],
    });

    await waitFor(() =>
      expect(sendTextMessage).toHaveBeenCalledWith({
        text: '',
        images: [{ file, altText: 'screenshot.png' }],
        skillId: undefined,
      }),
    );
    expect(contextValue.setPendingImages).toHaveBeenCalledWith([]);
  });

  it('sends nothing when nothing is pending', () => {
    const { sendTextMessage } = renderWithPending({ message: '', images: [] });

    expect(sendTextMessage).not.toHaveBeenCalled();
  });
});
