import { extractTextFromEml } from './eml';

function toBuffer(raw: string): Buffer {
  // Normalize to CRLF line endings, as real .eml files use.
  return Buffer.from(raw.replace(/\n/g, '\r\n'), 'utf8');
}

describe('extractTextFromEml', () => {
  it('extracts headers and the text/plain body', async () => {
    const eml = toBuffer(
      [
        'From: Alice <alice@example.com>',
        'To: Bob <bob@example.com>',
        'Subject: Anfrage zur Anmeldung',
        'Date: Wed, 12 Aug 2026 10:00:00 +0000',
        'Content-Type: text/plain; charset=utf-8',
        '',
        'Hallo Bob,',
        'dies ist der Inhalt der E-Mail mit Umlauten: äöü.',
      ].join('\n'),
    );

    const result = await extractTextFromEml(eml);

    expect(result).toContain('From: ');
    expect(result).toContain('alice@example.com');
    expect(result).toContain('bob@example.com');
    expect(result).toContain('Subject: Anfrage zur Anmeldung');
    expect(result).toContain(
      'dies ist der Inhalt der E-Mail mit Umlauten: äöü.',
    );
  });

  it('falls back to stripped HTML when there is no text/plain part', async () => {
    const eml = toBuffer(
      [
        'From: Alice <alice@example.com>',
        'Subject: HTML only',
        'Content-Type: text/html; charset=utf-8',
        '',
        '<html><body><p>Hallo <b>Welt</b></p></body></html>',
      ].join('\n'),
    );

    const result = await extractTextFromEml(eml);

    expect(result).toContain('Subject: HTML only');
    expect(result).toContain('Hallo');
    expect(result).toContain('Welt');
    expect(result).not.toContain('<b>');
  });

  it('lists attachment filenames from a multipart message', async () => {
    const boundary = 'boundary-123';
    const eml = toBuffer(
      [
        'From: Alice <alice@example.com>',
        'Subject: Mit Anhang',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        'Siehe Anhang.',
        `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8',
        'Content-Disposition: attachment; filename="notiz.txt"',
        '',
        'Anhangstext',
        `--${boundary}--`,
      ].join('\n'),
    );

    const result = await extractTextFromEml(eml);

    expect(result).toContain('Siehe Anhang.');
    expect(result).toContain('Attachments: notiz.txt');
  });
});
