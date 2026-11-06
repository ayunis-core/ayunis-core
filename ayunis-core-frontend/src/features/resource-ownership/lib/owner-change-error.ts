import extractErrorData from '@/shared/api/extract-error-data';

const MESSAGE_KEYS: Record<string, string> = {
  DUPLICATE_SKILL_NAME: 'change.duplicateName',
  SKILL_OWNER_CHANGE_NOT_ALLOWED: 'change.notAllowed',
  KNOWLEDGE_BASE_OWNER_CHANGE_NOT_ALLOWED: 'change.notAllowed',
  UNAUTHORIZED_ACCESS: 'change.noPermission',
  SKILL_NOT_FOUND: 'change.notFound',
  KNOWLEDGE_BASE_NOT_FOUND: 'change.notFound',
};

/** The `ownership` translation key for a failed owner change or preview. */
export function ownerChangeErrorKey(error: unknown): string {
  try {
    const { code } = extractErrorData(error);
    return MESSAGE_KEYS[code] ?? 'change.error';
  } catch {
    return 'change.error';
  }
}
