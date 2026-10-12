import { parseEml } from './eml';

function toBuffer(raw: string): Buffer {
  // Normalize to CRLF line endings, as real .eml files use.
  return Buffer.from(raw.replace(/\n/g, '\r\n'), 'utf8');
}

describe('parseEml', () => {
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

    const { text: result } = await parseEml(eml);

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

    const { text: result } = await parseEml(eml);

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

    const { text: result } = await parseEml(eml);

    expect(result).toContain('Siehe Anhang.');
    expect(result).toContain('Attachments: notiz.txt');
  });

  it('returns named attachments with their content and drops unnamed ones', async () => {
    const boundary = 'boundary-456';
    const eml = toBuffer(
      [
        'Subject: Mit Anhang',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        'Siehe Anhang.',
        `--${boundary}`,
        'Content-Type: application/pdf',
        'Content-Disposition: attachment; filename="bericht.pdf"',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from('%PDF-1.4').toString('base64'),
        `--${boundary}`,
        'Content-Type: application/octet-stream',
        'Content-Disposition: attachment',
        '',
        'unnamed',
        `--${boundary}--`,
      ].join('\n'),
    );

    const { attachments } = await parseEml(eml);

    expect(attachments).toHaveLength(1);
    expect(attachments[0].filename).toBe('bericht.pdf');
    expect(attachments[0].contentType).toBe('application/pdf');
    expect(attachments[0].content.toString()).toBe('%PDF-1.4');
  });
});
