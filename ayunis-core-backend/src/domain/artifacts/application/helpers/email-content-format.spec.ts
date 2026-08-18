import {
  EMAIL_CONTENT_FORMAT,
  parseEmailContent,
  serializeEmailContent,
} from './email-content-format';
import { InvalidEmailContentError } from '../artifacts.errors';

describe('email-content-format', () => {
  it('round-trips a versioned email payload', () => {
    const content = serializeEmailContent({
      subject: 'Project update',
      to: ['alice@example.com'],
      cc: [],
      bcc: [],
      body: 'Hello Alice',
    });

    expect(parseEmailContent(content)).toEqual({
      format: EMAIL_CONTENT_FORMAT,
      subject: 'Project update',
      to: ['alice@example.com'],
      cc: [],
      bcc: [],
      body: 'Hello Alice',
    });
  });

  it('rejects malformed payloads and invalid recipient lists', () => {
    expect(() => parseEmailContent('not json')).toThrow(
      InvalidEmailContentError,
    );
    expect(() =>
      serializeEmailContent({
        subject: 'Subject',
        to: ['not-an-email'],
        cc: [],
        bcc: [],
        body: 'Body',
      }),
    ).toThrow(InvalidEmailContentError);
    expect(() =>
      serializeEmailContent({
        subject: 'Subject',
        to: [],
        cc: [],
        bcc: [],
        body: 'Body',
      }),
    ).toThrow(InvalidEmailContentError);
  });
});
