import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '@/pages/chat/model/openapi';
import { PiiMaskProvider } from '@/widgets/markdown';
import ChatMessage from './ChatMessage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/widgets/markdown', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Markdown: ({ children }: { children: string }) => <p>{children}</p>,
}));

vi.mock('@ayunis/ui/components/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
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

  it('copies the prompt as the user typed it, with masked PII restored and without the hidden skill instruction', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write: vi.fn(), writeText },
    });

    render(
      <PiiMaskProvider
        masks={[
          {
            id: 'mask-1',
            token: '{{pii:PERSON_NAME_1}}',
            value: 'Erika Mustermann',
            category: 'person_name',
            unmasked: false,
          },
        ]}
      >
        <ChatMessage
          message={userMessage([
            {
              type: 'text',
              text: 'Internal skill instruction',
              isSkillInstruction: true,
            },
            {
              type: 'text',
              text: 'Schreibe **{{pii:PERSON_NAME_1}}** eine Antwort',
            },
          ])}
        />
      </PiiMaskProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'chat.copyToClipboard' }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        'Schreibe **Erika Mustermann** eine Antwort',
      );
    });
  });
});
