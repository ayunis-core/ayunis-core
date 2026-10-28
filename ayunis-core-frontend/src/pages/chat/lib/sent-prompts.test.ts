import { describe, expect, it } from 'vitest';
import type { Message } from '@/pages/chat/model/openapi';
import { sentPrompts } from './sent-prompts';

function message(
  role: 'user' | 'assistant',
  content: Array<{ type: string; text?: string; isSkillInstruction?: boolean }>,
): Message {
  return {
    id: crypto.randomUUID(),
    threadId: 'thread-1',
    createdAt: '2026-10-20T00:00:00.000Z',
    role,
    content,
  } as Message;
}

describe('sentPrompts', () => {
  it('returns the thread’s user prompts oldest first, as they are displayed', () => {
    const messages = [
      message('user', [{ type: 'text', text: 'Opening hours?' }]),
      message('assistant', [{ type: 'text', text: 'Mon–Fri 8–16.' }]),
      message('user', [
        {
          type: 'text',
          text: 'Use the permit skill',
          isSkillInstruction: true,
        },
        { type: 'text', text: 'Draft a parking permit notice' },
      ]),
    ];

    expect(sentPrompts(messages, [])).toEqual([
      'Opening hours?',
      'Draft a parking permit notice',
    ]);
  });

  it('skips user messages without text, such as image-only ones', () => {
    const messages = [message('user', [{ type: 'image' }])];

    expect(sentPrompts(messages, [])).toEqual([]);
  });

  it('restores the original wording of masked PII, as the thread shows it', () => {
    const messages = [
      message('user', [
        {
          type: 'text',
          text: 'Write to {{pii:PERSON_NAME_1}} about {{pii:IBAN_1}}',
        },
      ]),
    ];
    const piiMasks = [
      { token: '{{pii:PERSON_NAME_1}}', value: 'Erika Muster' },
    ];

    expect(sentPrompts(messages, piiMasks)).toEqual([
      'Write to Erika Muster about {{pii:IBAN_1}}',
    ]);
  });

  it('includes the prompt still waiting for the server as the newest', () => {
    const messages = [
      message('user', [{ type: 'text', text: 'Opening hours?' }]),
    ];

    expect(sentPrompts(messages, [], 'And on weekends?')).toEqual([
      'Opening hours?',
      'And on weekends?',
    ]);
  });
});
