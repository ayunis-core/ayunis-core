export const EMAIL_CONTENT_FORMAT = 'email-v1';

export interface EmailContent {
  readonly format: typeof EMAIL_CONTENT_FORMAT;
  readonly subject: string;
  readonly to: string[];
  readonly cc: string[];
  readonly bcc: string[];
  readonly body: string;
}

export type EditableEmailContent = Omit<EmailContent, 'format'>;

export const EMPTY_EMAIL_CONTENT: EditableEmailContent = {
  subject: '',
  to: [],
  cc: [],
  bcc: [],
  body: '',
};

export function parseEmailContent(raw: string): EmailContent | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isEmailContent(value)) return null;
    return value;
  } catch {
    return null;
  }
}

export function serializeEmailContent(content: EditableEmailContent): string {
  return JSON.stringify({ format: EMAIL_CONTENT_FORMAT, ...content });
}

export function parseRecipients(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((recipient) => recipient.trim())
    .filter(Boolean);
}

export function formatRecipients(recipients: string[]): string {
  return recipients.join(', ');
}

export function isValidEmailContent(content: EditableEmailContent): boolean {
  return (
    content.subject.trim() !== '' &&
    content.to.length > 0 &&
    [content.to, content.cc, content.bcc].every((recipients) =>
      recipients.every(isValidRecipient),
    )
  );
}

export function isValidRecipient(value: string): boolean {
  return isValidPiiToken(value) || isValidEmailAddress(value);
}

function isValidEmailAddress(value: string): boolean {
  if (value.includes(' ')) return false;
  const atIndex = value.indexOf('@');
  if (atIndex <= 0 || value.indexOf('@', atIndex + 1) !== -1) return false;
  const domain = value.slice(atIndex + 1);
  const dotIndex = domain.indexOf('.');
  return dotIndex > 0 && dotIndex < domain.length - 1;
}

function isValidPiiToken(value: string): boolean {
  if (!value.startsWith('{{pii:') || !value.endsWith('}}')) return false;
  const token = value.slice('{{pii:'.length, -2);
  const separatorIndex = token.lastIndexOf('_');
  if (separatorIndex <= 0 || separatorIndex === token.length - 1) return false;

  const name = token.slice(0, separatorIndex);
  const sequence = token.slice(separatorIndex + 1);
  return (
    isUppercaseLetter(name[0]) &&
    [...name].every(isPiiNameCharacter) &&
    [...sequence].every(isDigit)
  );
}

function isUppercaseLetter(value: string | undefined): boolean {
  return value !== undefined && value >= 'A' && value <= 'Z';
}

function isPiiNameCharacter(value: string): boolean {
  return isUppercaseLetter(value) || isDigit(value) || value === '_';
}

function isDigit(value: string): boolean {
  return value >= '0' && value <= '9';
}

function isEmailContent(value: unknown): value is EmailContent {
  if (!isRecord(value) || value.format !== EMAIL_CONTENT_FORMAT) return false;
  return (
    typeof value.subject === 'string' &&
    typeof value.body === 'string' &&
    isStringArray(value.to) &&
    isStringArray(value.cc) &&
    isStringArray(value.bcc)
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
