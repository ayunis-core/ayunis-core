import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '@/pages/chat/model/openapi';
import ChatMessage from './ChatMessage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/widgets/markdown', () => ({
  Markdown: ({ children }: { children: string }) => <p>{children}</p>,
}));

function userMessage(content: Array<Record<string, unknown>>): Message {
  return {
    id: 'message-1',
    threadId: 'thread-1',
    role: 'user',
    content,
    createdAt: '2026-11-07T06:30:00.000Z',
  } as unknown as Message;
}

describe('ChatMessage', () => {
  it('shows a reminder sent to a routine run as a notice, not as the user’s message', () => {
    render(
      <ChatMessage
        message={userMessage([
          { type: 'text', text: 'Nobody can read this reply.', isNudge: true },
        ])}
      />,
    );

    expect(screen.getByTestId('routine-nudge').textContent).toContain(
      'chat.routine.nudge',
    );
    expect(screen.queryByTestId('user-message')).toBeNull();
  });

  it('shows a routine task as the user’s message', () => {
    render(
      <ChatMessage
        message={userMessage([{ type: 'text', text: 'Prüfe das Amtsblatt' }])}
      />,
    );

    expect(screen.getByTestId('user-message').textContent).toContain(
      'Prüfe das Amtsblatt',
    );
    expect(screen.queryByTestId('routine-nudge')).toBeNull();
  });
});
