import MsgReader, { type FieldsData } from '@kenjiuno/msgreader';
import { buildHeaderLines, extractBody } from './eml';

function formatAddress(name: string | undefined, address: string | undefined) {
  if (!address) return name ?? '';
  if (!name || name === address) return address;
  return `${name} <${address}>`;
}

function formatRecipients(recipients: FieldsData[], type: 'to' | 'cc'): string {
  return recipients
    .filter((recipient) => recipient.recipType === type)
    .map((recipient) =>
      formatAddress(recipient.name, recipient.smtpAddress ?? recipient.email),
    )
    .filter((text) => text.length > 0)
    .join(', ');
}

function formatDate(fields: FieldsData): string {
  const raw = fields.clientSubmitTime ?? fields.messageDeliveryTime;
  const date = raw ? new Date(raw) : undefined;
  return date && !isNaN(date.getTime()) ? date.toISOString() : '';
}

const HTML_ENCODING_BY_CODEPAGE: Partial<Record<number, string>> = {
  874: 'windows-874',
  932: 'shift_jis',
  936: 'gbk',
  949: 'euc-kr',
  950: 'big5',
  1200: 'utf-16le',
  1201: 'utf-16be',
  20127: 'us-ascii',
  20866: 'koi8-r',
  21866: 'koi8-u',
  28591: 'iso-8859-1',
  28592: 'iso-8859-2',
  28593: 'iso-8859-3',
  28594: 'iso-8859-4',
  28595: 'iso-8859-5',
  28596: 'iso-8859-6',
  28597: 'iso-8859-7',
  28598: 'iso-8859-8',
  28599: 'iso-8859-9',
  28603: 'iso-8859-13',
  28605: 'iso-8859-15',
  50220: 'iso-2022-jp',
  50221: 'iso-2022-jp',
  50222: 'iso-2022-jp',
  51932: 'euc-jp',
  51949: 'euc-kr',
  54936: 'gb18030',
  65001: 'utf-8',
};

function decodeHtml(fields: FieldsData): string {
  if (fields.bodyHtml) return fields.bodyHtml;
  if (!fields.html) return '';
  const codepage = fields.internetCodepage;
  const encoding =
    codepage && codepage >= 1250 && codepage <= 1258
      ? `windows-${codepage}`
      : (HTML_ENCODING_BY_CODEPAGE[codepage ?? 65001] ?? 'utf-8');
  return new TextDecoder(encoding).decode(fields.html);
}

const WINDOWS_ANSI_CODEPAGES = new Set([
  874, 932, 936, 949, 950, 1250, 1251, 1252, 1253, 1254, 1255, 1256, 1257, 1258,
]);

// Internet charsets Outlook records for messages whose 8-bit properties are
// stored in the matching Windows ANSI codepage.
const ANSI_CODEPAGE_BY_INTERNET_CODEPAGE: Record<number, number> = {
  20127: 1252, // us-ascii
  28591: 1252, // iso-8859-1
  28605: 1252, // iso-8859-15
  28592: 1250, // iso-8859-2
  28595: 1251, // iso-8859-5
  20866: 1251, // koi8-r
  28597: 1253, // iso-8859-7
  28599: 1254, // iso-8859-9
  50220: 932, // iso-2022-jp
  50221: 932,
  50222: 932,
  51932: 932, // euc-jp
  52936: 936, // hz-gb-2312
  54936: 936, // gb18030
  51949: 949, // euc-kr
};

/**
 * Non-Unicode messages store their 8-bit (PT_STRING8) properties in the
 * sender's ANSI codepage, which MsgReader would otherwise decode as Latin-1.
 * ponytail: falls back to Windows-1252 when the message records no usable
 * codepage, the right guess for the German-language mail Ayunis receives.
 */
function ansiEncoding(fields: FieldsData): string {
  const codepage = fields.messageCodepage ?? fields.internetCodepage;
  if (codepage && WINDOWS_ANSI_CODEPAGES.has(codepage)) return `cp${codepage}`;
  const mapped = codepage && ANSI_CODEPAGE_BY_INTERNET_CODEPAGE[codepage];
  return `cp${mapped || 1252}`;
}

function readFields(fileData: Buffer): FieldsData {
  const view = () =>
    new DataView(fileData.buffer, fileData.byteOffset, fileData.byteLength);
  const probe = new MsgReader(view()).getFileData();
  if (probe.error) throw new Error(probe.error);
  // Any compound file passes MsgReader's header check; an Outlook item always
  // carries a message class (IPM.Note for email).
  if (!probe.messageClass) throw new Error('Not an Outlook message');

  // Codepage properties are numeric, so the first pass reads them correctly
  // regardless of encoding; the second decodes the strings with them.
  const reader = new MsgReader(view());
  reader.parserConfig = { ansiEncoding: ansiEncoding(probe) };
  return reader.getFileData();
}

/**
 * Flatten an Outlook message (.msg) into the same plain-text representation
 * {@link extractTextFromEml} produces. Throws when the file is not a readable
 * Outlook message.
 */
export function extractTextFromMsg(fileData: Buffer): string {
  const fields = readFields(fileData);

  const recipients = fields.recipients ?? [];
  const attachmentNames = (fields.attachments ?? [])
    .map((attachment) => attachment.fileName ?? attachment.name)
    .filter((name): name is string => Boolean(name));

  const header = buildHeaderLines([
    {
      label: 'From',
      value: formatAddress(
        fields.senderName,
        fields.senderSmtpAddress ?? fields.senderEmail,
      ),
    },
    { label: 'To', value: formatRecipients(recipients, 'to') },
    { label: 'Cc', value: formatRecipients(recipients, 'cc') },
    { label: 'Subject', value: fields.subject ?? '' },
    { label: 'Date', value: formatDate(fields) },
    { label: 'Attachments', value: attachmentNames.join(', ') },
  ]);

  const body = extractBody(
    fields.body?.replace(/\r\n/g, '\n'),
    decodeHtml(fields),
  );

  return [header, body].filter((section) => section.length > 0).join('\n\n');
}
