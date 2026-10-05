import { buildMsgFile } from 'src/common/testing/msg-file.builder';
import { extractTextFromMsg } from './msg';

describe('extractTextFromMsg', () => {
  it('extracts headers, body and attachment names like an .eml', () => {
    const msg = buildMsgFile({
      subject: 'Anfrage zur Anmeldung',
      senderName: 'Alice',
      senderSmtpAddress: 'alice@example.com',
      submitTime: new Date('2026-08-12T10:00:00Z'),
      body: 'Hallo Bob,\r\ndies ist der Inhalt mit Umlauten: äöü.\r\n',
      recipients: [
        { name: 'Bob', smtpAddress: 'bob@example.com', type: 'to' },
        {
          name: 'carol@example.com',
          smtpAddress: 'carol@example.com',
          type: 'cc',
        },
      ],
      attachmentNames: ['notiz.txt', 'plan.pdf'],
    });

    expect(extractTextFromMsg(msg)).toBe(
      [
        'From: Alice <alice@example.com>',
        'To: Bob <bob@example.com>',
        'Cc: carol@example.com',
        'Subject: Anfrage zur Anmeldung',
        'Date: 2026-08-12T10:00:00.000Z',
        'Attachments: notiz.txt, plan.pdf',
        '',
        'Hallo Bob,\ndies ist der Inhalt mit Umlauten: äöü.',
      ].join('\n'),
    );
  });

  it('falls back to stripped HTML when there is no plain-text body', () => {
    const msg = buildMsgFile({
      subject: 'HTML only',
      bodyHtml: '<html><body><p>Hallo <b>Welt</b></p></body></html>',
    });

    const result = extractTextFromMsg(msg);

    expect(result).toContain('Subject: HTML only');
    expect(result).toContain('Hallo Welt');
    expect(result).not.toContain('<b>');
  });

  it.each([
    [
      'ISO-8859-1',
      28591,
      Buffer.from('<p>Grüße für Köln</p>', 'latin1'),
      'Grüße für Köln',
    ],
    [
      'CP932',
      932,
      Buffer.from([
        0x3c, 0x70, 0x3e, 0x93, 0xfa, 0x96, 0x7b, 0x8c, 0xea, 0x3c, 0x2f, 0x70,
        0x3e,
      ]),
      '日本語',
    ],
    [
      'UTF-16LE',
      1200,
      Buffer.from('<p>Grüße für Köln</p>', 'utf16le'),
      'Grüße für Köln',
    ],
    ['UTF-8', 65001, Buffer.from('<p>Grüße für Köln</p>'), 'Grüße für Köln'],
    [
      'Windows-1252',
      1252,
      Buffer.from([0x3c, 0x70, 0x3e, 0x80, 0x3c, 0x2f, 0x70, 0x3e]),
      '€',
    ],
    [
      'missing codepage',
      undefined,
      Buffer.from('<p>Grüße für Köln</p>'),
      'Grüße für Köln',
    ],
    [
      'unknown codepage',
      99999,
      Buffer.from('<p>Grüße für Köln</p>'),
      'Grüße für Köln',
    ],
  ])(
    'decodes a binary HTML body using %s',
    (_label, internetCodepage, binaryHtml, expected) => {
      const msg = buildMsgFile({ internetCodepage, binaryHtml });

      expect(extractTextFromMsg(msg)).toBe(expected);
    },
  );

  it('prefers plain text over the binary HTML body', () => {
    const msg = buildMsgFile({
      body: 'Maßgeblicher Text',
      binaryHtml: Buffer.from('<p>Anderer Inhalt</p>', 'latin1'),
      internetCodepage: 28591,
    });

    expect(extractTextFromMsg(msg)).toBe('Maßgeblicher Text');
  });

  it.each([
    // "Rechnung – 5 €" in Windows-1252, which has no Latin-1 equivalent for – or €.
    [
      'Windows-1252',
      28591,
      Buffer.from([
        ...Buffer.from('Rechnung '),
        0x96,
        ...Buffer.from(' 5 '),
        0x80,
      ]),
      'Rechnung – 5 €',
    ],
    // "日本語" in Shift-JIS (CP932); Outlook reports ISO-2022-JP as the internet codepage.
    [
      'CP932',
      50220,
      Buffer.from([0x93, 0xfa, 0x96, 0x7b, 0x8c, 0xea]),
      '日本語',
    ],
  ])(
    'decodes a non-Unicode %s subject with its ANSI codepage',
    (_label, internetCodepage, ansiSubject, expected) => {
      const msg = buildMsgFile({ ansiSubject, internetCodepage });

      expect(extractTextFromMsg(msg)).toBe(`Subject: ${expected}`);
    },
  );

  it('throws for a compound file that is not an Outlook message', () => {
    const notAnEmail = buildMsgFile({ messageClass: null, subject: 'x' });

    expect(() => extractTextFromMsg(notAnEmail)).toThrow();
  });

  it.each([
    ['not a compound file', Buffer.from('not an outlook message')],
    ['an empty buffer', Buffer.alloc(0)],
  ])('throws for %s', (_label, data) => {
    expect(() => extractTextFromMsg(data)).toThrow();
  });
});
