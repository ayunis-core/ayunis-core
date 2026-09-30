import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LongChatWarning from './LongChatWarning';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}));

describe(LongChatWarning.name, () => {
  it('explains the model limit and offers a new chat', () => {
    render(<LongChatWarning />);

    const alert = screen.getByTestId('chat-long-chat-alert');
    expect(alert.textContent).toContain('chat.longChatWarningTitle');
    expect(alert.textContent).toContain('chat.longChatWarningDescription');

    fireEvent.click(screen.getByText('newChat.newChat'));
    expect(navigate).toHaveBeenCalledWith({ to: '/chat' });
  });

  it('hides the warning once dismissed', () => {
    render(<LongChatWarning />);

    fireEvent.click(screen.getByTestId('chat-long-chat-alert-dismiss'));

    expect(screen.queryByTestId('chat-long-chat-alert')).toBeNull();
  });
});
