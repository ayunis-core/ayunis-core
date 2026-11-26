import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  LongChatWarning,
  ProviderFaultNotice,
} from '@ayunis/chat/model-presentation';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { modelName?: string }) =>
      options?.modelName ? `${key}: ${options.modelName}` : key,
  }),
}));

describe('shared model notices', () => {
  it('explains the model limit, offers a new chat, and can be dismissed', () => {
    const onNewChat = vi.fn();
    render(<LongChatWarning onNewChat={onNewChat} />);

    const alert = screen.getByTestId('chat-long-chat-alert');
    expect(alert.textContent).toContain('chat.longChatWarningTitle');
    expect(alert.textContent).toContain('chat.longChatWarningDescription');
    fireEvent.click(screen.getByText('newChat.newChat'));
    expect(onNewChat).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByTestId('chat-long-chat-alert-dismiss'));
    expect(screen.queryByTestId('chat-long-chat-alert')).toBeNull();
  });

  it('names the model whose provider is unavailable', () => {
    render(<ProviderFaultNotice modelName="GPT-4 Test" />);

    const alert = screen.getByTestId('chat-model-provider-fault-alert');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toContain(
      'chat.modelProviderFaultWarning: GPT-4 Test',
    );
  });
});
