import { simpleParser, type AddressObject } from 'mailparser';
import { parse as parseHtml } from 'node-html-parser';

function formatAddresses(
  address: AddressObject | AddressObject[] | undefined,
): string {
  if (!address) return '';
  const list = Array.isArray(address) ? address : [address];
  return list
    .map((entry) => entry.text)
    .filter((text) => Boolean(text))
    .join(', ');
}

function htmlToText(html: string): string {
  // Collapse the runs of blank lines the HTML structure leaves behind so the
  // extracted body reads like the message did, not like marked-up source.
  return parseHtml(html)
    .textContent.replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractBody(
  text: string | undefined,
  html: string | false,
): string {
  const plain = text?.trim() ?? '';
  if (plain.length > 0) return plain;
  return html ? htmlToText(html) : '';
}

export function buildHeaderLines(
  fields: { label: string; value: string }[],
): string {
  return fields
    .filter((field) => field.value.length > 0)
    .map((field) => `${field.label}: ${field.value}`)
    .join('\n');
}

export interface EmlAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

/**
 * Flatten an RFC 822 email (.eml) into a plain-text representation: a header
 * block (From/To/Cc/Subject/Date/Attachments) followed by the message body.
 * The text/plain part is preferred; HTML-only messages fall back to their
 * stripped text so the downstream chunking pipeline receives readable content.
 * Named attachments are returned alongside so callers can extract them.
 */
export async function parseEml(
  fileData: Buffer,
): Promise<{ text: string; attachments: EmlAttachment[] }> {
  const parsed = await simpleParser(fileData);

  const attachments = parsed.attachments
    .filter((attachment) => Boolean(attachment.filename))
    .map((attachment) => ({
      filename: attachment.filename as string,
      contentType: attachment.contentType,
      content: attachment.content,
    }));

  const header = buildHeaderLines([
    { label: 'From', value: formatAddresses(parsed.from) },
    { label: 'To', value: formatAddresses(parsed.to) },
    { label: 'Cc', value: formatAddresses(parsed.cc) },
    { label: 'Subject', value: parsed.subject ?? '' },
    { label: 'Date', value: parsed.date ? parsed.date.toISOString() : '' },
    {
      label: 'Attachments',
      value: attachments.map((attachment) => attachment.filename).join(', '),
    },
  ]);

  const body = extractBody(parsed.text, parsed.html);

  const text = [header, body]
    .filter((section) => section.length > 0)
    .join('\n\n');
  return { text, attachments };
}
