import { describe, it, expect } from 'vitest';
import { getReplyHtml } from './compose-reply';
import type { Message } from '../model/openapi';

function assistantWithSendEmail(id: string, body: string): Message {
  return {
    id,
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: `${id}-tool`,
        name: 'send_email',
        params: { body },
      },
    ],
  } as unknown as Message;
}

function assistantWithText(id: string, text: string): Message {
  return {
    id,
    role: 'assistant',
    content: [{ type: 'text', text }],
  } as unknown as Message;
}

function toolResult(id: string): Message {
  return {
    id,
    role: 'tool',
    content: [{ type: 'tool_result', toolId: `${id}-tool`, result: 'ok' }],
  } as unknown as Message;
}

describe('getReplyHtml', () => {
  it('finds the send_email draft when a tool result is the last message', () => {
    const messages = [
      assistantWithSendEmail('a1', 'Sehr geehrte Damen und Herren,\n\nDanke.'),
      toolResult('t1'),
    ];

    const reply = getReplyHtml(messages);

    expect(reply?.id).toBe('a1');
    expect(reply?.html).toContain('Sehr geehrte Damen und Herren,');
  });

  it('uses a plain-text answer that reads like an email reply', () => {
    const messages = [
      assistantWithText(
        'a1',
        'Guten Tag,\n\nalles klar.\n\nMit freundlichen Grüßen',
      ),
    ];

    expect(getReplyHtml(messages)?.id).toBe('a1');
  });

  it('ignores an answer that is not a reply', () => {
    const messages = [
      assistantWithText('a1', 'Hier die Zusammenfassung: kurz.'),
    ];

    expect(getReplyHtml(messages)).toBeNull();
  });

  it('returns null without any assistant message', () => {
    expect(getReplyHtml([toolResult('t1')])).toBeNull();
    expect(getReplyHtml([])).toBeNull();
  });
});
