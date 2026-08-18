import { describe, expect, it } from 'vitest';
import {
  formatRecipients,
  isValidEmailContent,
  isValidRecipient,
  parseEmailContent,
  parseRecipients,
  serializeEmailContent,
} from './email-content';

describe('email content format', () => {
  it('round-trips the editor content', () => {
    const content = {
      subject: 'A subject',
      to: ['to@example.com'],
      cc: ['cc@example.com'],
      bcc: [],
      body: 'Message body',
    };

    expect(parseEmailContent(serializeEmailContent(content))).toEqual({
      format: 'email-v1',
      ...content,
    });
  });

  it('rejects malformed content and parses recipient input', () => {
    expect(parseEmailContent('{"format":"other"}')).toBeNull();
    expect(parseRecipients('one@example.com, two@example.com\n')).toEqual([
      'one@example.com',
      'two@example.com',
    ]);
    expect(formatRecipients(['one@example.com', 'two@example.com'])).toBe(
      'one@example.com, two@example.com',
    );
  });

  it('validates recipients using the backend email-v1 rules', () => {
    expect(isValidRecipient('one@example.com')).toBe(true);
    expect(isValidRecipient('{{pii:EMAIL_ADDRESS_1}}')).toBe(true);
    expect(isValidRecipient('not-an-email')).toBe(false);
    expect(
      isValidEmailContent({
        subject: 'Subject',
        to: ['one@example.com'],
        cc: ['invalid'],
        bcc: [],
        body: 'Body',
      }),
    ).toBe(false);
  });
});
