import { InvalidEmailContentError } from '../artifacts.errors';

export const EMAIL_CONTENT_FORMAT = 'email-v1';
const PII_TOKEN_PATTERN = /^\{\{pii:[A-Z][A-Z0-9_]*_\d+\}\}$/;

export interface EmailContentV1 {
  format: typeof EMAIL_CONTENT_FORMAT;
  subject: string;
  to: string[];
  cc: string[];
  bcc: string[];
  body: string;
}

export function parseEmailContent(raw: string): EmailContentV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidEmailContentError('content is not valid JSON');
  }

  if (!isRecord(parsed)) {
    throw new InvalidEmailContentError('content must be a JSON object');
  }
  if (parsed.format !== EMAIL_CONTENT_FORMAT) {
    throw new InvalidEmailContentError(
      `format must be '${EMAIL_CONTENT_FORMAT}'`,
    );
  }

  return buildEmailContent(parsed);
}

export function serializeEmailContent(
  content: Omit<EmailContentV1, 'format'>,
): string {
  const normalized = buildEmailContent({
    format: EMAIL_CONTENT_FORMAT,
    ...content,
  });
  return JSON.stringify(normalized);
}

function buildEmailContent(value: Record<string, unknown>): EmailContentV1 {
  if (typeof value.subject !== 'string' || value.subject.trim() === '') {
    throw new InvalidEmailContentError('subject must be a non-empty string');
  }
  if (typeof value.body !== 'string') {
    throw new InvalidEmailContentError('body must be a string');
  }

  return {
    format: EMAIL_CONTENT_FORMAT,
    subject: value.subject,
    to: validateRecipients(value.to, 'to', true),
    cc: validateRecipients(value.cc, 'cc'),
    bcc: validateRecipients(value.bcc, 'bcc'),
    body: value.body,
  };
}

function validateRecipients(
  value: unknown,
  field: string,
  required = false,
): string[] {
  if (
    !Array.isArray(value) ||
    (required && value.length === 0) ||
    !value.every(isEmailAddress)
  ) {
    throw new InvalidEmailContentError(
      `${field} must be an array of valid email addresses`,
    );
  }
  return [...value];
}

function isEmailAddress(value: unknown): value is string {
  if (typeof value !== 'string' || value.includes(' ')) return false;
  if (PII_TOKEN_PATTERN.test(value)) return true;
  const atIndex = value.indexOf('@');
  return (
    atIndex > 0 &&
    atIndex < value.length - 1 &&
    value.indexOf('@', atIndex + 1) === -1 &&
    value.indexOf('.', atIndex + 2) > atIndex + 1
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
