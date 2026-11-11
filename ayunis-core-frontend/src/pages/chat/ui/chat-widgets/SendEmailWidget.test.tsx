import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import SendEmailWidget from './SendEmailWidget';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const trackOutcome = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/openpanel-outcomes', () => ({
  useTrackProductiveOutcome: () => trackOutcome,
}));

const email: ToolUseMessageContent = {
  type: 'tool_use',
  id: 'tool-email-1',
  name: 'send_email',
  params: { to: 'amt@example.org', subject: 'Antrag', body: 'Guten Tag' },
};

function stubClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
}

describe('SendEmailWidget', () => {
  beforeEach(() => {
    trackOutcome.mockReset();
  });

  it('sends email_handed_off when the mail client link is opened', () => {
    render(<SendEmailWidget content={email} />);

    fireEvent.click(
      screen.getByRole('link', { name: 'chat.tools.send_email.open' }),
    );

    expect(trackOutcome.mock.calls).toEqual([
      [
        {
          outcome_type: 'email_handed_off',
          output_type: 'email',
          format: 'mailto',
        },
      ],
    ]);
  });

  it('sends email_handed_off once the body copy reached the clipboard', async () => {
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    render(<SendEmailWidget content={email} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'chat.tools.send_email.copyBody' }),
    );

    await waitFor(() =>
      expect(trackOutcome.mock.calls).toEqual([
        [
          {
            outcome_type: 'email_handed_off',
            output_type: 'email',
            format: 'clipboard',
          },
        ],
      ]),
    );
  });

  it('sends nothing when the clipboard rejected the body copy', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    stubClipboard(writeText);
    render(<SendEmailWidget content={email} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'chat.tools.send_email.copyBody' }),
    );

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(trackOutcome).not.toHaveBeenCalled();
  });
});
