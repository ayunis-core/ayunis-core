import type { Message } from '../model/openapi';

export function getSendEmailBody(message: Message): string | null {
  const blocks = message.content as unknown as Array<{
    name?: string;
    params?: { body?: string };
  }>;
  const email = blocks.find((block) => block.name === 'send_email');
  const body = email?.params?.body;
  return typeof body === 'string' && body.trim() ? body.trim() : null;
}

export function extractPlainText(message: Message): string {
  const blocks = message.content as unknown as Array<{
    type?: string;
    text?: string;
  }>;
  return blocks
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text ?? '')
    .join('\n\n')
    .trim();
}

export function replyTextToHtml(text: string): string {
  const escape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 12px 0">${escape(paragraph).replace(/\n/g, '<br>')}</p>`,
    )
    .join('');
}

const EMAIL_CLOSINGS = [
  'mit freundlichen grüßen',
  'mit freundlichem gruß',
  'freundliche grüße',
  'viele grüße',
  'beste grüße',
  'mit besten grüßen',
  'herzliche grüße',
  'liebe grüße',
  'schöne grüße',
];

export function looksLikeEmailReply(text: string): boolean {
  const lower = text.toLowerCase();
  return EMAIL_CLOSINGS.some((closing) => lower.includes(closing));
}
