import {
  mailboxSupports,
  officeAsync,
} from '@/outlook/lib/outlook-tools/office-async';
import {
  listAttachments,
  type AttachmentInfo,
  type OutlookItem,
} from '@/outlook/lib/outlook-tools/outlook-item';

export type ExtractAttachmentText = (file: {
  name: string;
  contentType: string;
  base64: string;
}) => Promise<string>;

const MAX_TEXT_LENGTH = 100_000;
const TEXT_EXTENSIONS = ['.txt', '.md', '.csv'];
const UNKNOWN_CONTENT_TYPE = 'application/octet-stream';

export function toolError(message: string): string {
  return JSON.stringify({ error: message });
}

function truncate(text: string): string {
  return text.length > MAX_TEXT_LENGTH
    ? `${text.slice(0, MAX_TEXT_LENGTH)}\n[truncated]`
    : text;
}

function stringParam(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function findAttachment(
  attachments: AttachmentInfo[],
  params: Record<string, unknown>,
): AttachmentInfo | undefined {
  const id = stringParam(params.attachmentId);
  const name = stringParam(params.name)?.toLowerCase();
  return (
    attachments.find(
      (attachment) => id !== undefined && attachment.id === id,
    ) ??
    attachments.find(
      (attachment) =>
        name !== undefined && attachment.name.toLowerCase() === name,
    )
  );
}

function isPlainText(attachment: AttachmentInfo): boolean {
  const name = attachment.name.toLowerCase();
  return (
    TEXT_EXTENSIONS.some((extension) => name.endsWith(extension)) ||
    (attachment.contentType?.toLowerCase().startsWith('text/') ?? false)
  );
}

function decodeBase64Utf8(base64: string): string {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function fetchContent(
  outlookItem: OutlookItem,
  attachmentId: string,
): Promise<Office.AttachmentContent> {
  const { item } = outlookItem;
  const getContent = item.getAttachmentContentAsync;
  if (typeof getContent !== 'function') {
    return Promise.reject(new Error('attachments need Mailbox 1.8'));
  }
  return officeAsync<Office.AttachmentContent>((callback) =>
    getContent.call(item, attachmentId, callback),
  );
}

async function contentToText(
  attachment: AttachmentInfo,
  content: Office.AttachmentContent,
  extractAttachmentText: ExtractAttachmentText | undefined,
): Promise<string> {
  // The values of Office.MailboxEnums.AttachmentContentFormat.
  const format: string = content.format;
  if (format === 'url') {
    return toolError('this attachment type cannot be read');
  }
  // Attached mails and calendar items come back as their raw text already.
  if (format !== 'base64') {
    return truncate(content.content);
  }
  if (isPlainText(attachment)) {
    return truncate(decodeBase64Utf8(content.content));
  }
  if (!extractAttachmentText) {
    return toolError('this attachment type cannot be read');
  }
  const text = await extractAttachmentText({
    name: attachment.name,
    contentType: attachment.contentType ?? UNKNOWN_CONTENT_TYPE,
    base64: content.content,
  });
  return truncate(text);
}

export async function readAttachment(
  outlookItem: OutlookItem,
  params: Record<string, unknown>,
  extractAttachmentText: ExtractAttachmentText | undefined,
): Promise<string> {
  if (!mailboxSupports('1.8')) {
    return toolError('attachments need Mailbox 1.8');
  }
  const attachment = findAttachment(await listAttachments(outlookItem), params);
  if (!attachment) {
    return toolError('attachment not found');
  }
  const content = await fetchContent(outlookItem, attachment.id);
  return contentToText(attachment, content, extractAttachmentText);
}
