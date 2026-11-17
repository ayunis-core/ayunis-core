import type { ParsedInvite } from './csv-utils';

interface ServerValidationError {
  row: number;
  email: string;
  errorCode: string;
  message: string;
}

type Translate = (key: string, values?: Record<string, string>) => string;

const TRANSLATION_KEYS: Record<string, string> = {
  DUPLICATE_EMAIL_IN_REQUEST: 'bulkInvite.duplicateEmail',
  EMAIL_PROVIDER_BLACKLISTED: 'inviteCreate.emailProviderBlacklisted',
  EMAIL_ALREADY_INVITED: 'bulkInvite.emailAlreadyInvited',
  EMAIL_ALREADY_USER: 'bulkInvite.emailAlreadyUser',
  TEAM_NOT_FOUND: 'bulkInvite.teamNotFound',
};

export function applyValidationErrors(
  current: ParsedInvite[],
  errors: ServerValidationError[],
  translate: Translate,
): ParsedInvite[] {
  const errorsByEmail = new Map<string, string[]>();
  for (const error of errors) {
    const email = error.email.toLowerCase();
    const messages = errorsByEmail.get(email) ?? [];
    messages.push(localizedError(error, translate));
    errorsByEmail.set(email, messages);
  }
  return current.map((item) => {
    if (!item.isValid) return item;
    const messages = errorsByEmail.get(item.email.toLowerCase());
    if (!messages) return item;
    return {
      ...item,
      isValid: false,
      serverError: messages.join('; '),
    };
  });
}

function localizedError(
  error: ServerValidationError,
  translate: Translate,
): string {
  if (error.errorCode === 'TEAM_NOT_FOUND') {
    const teamNames = /^Unknown teams?: (.+)$/.exec(error.message)?.[1];
    if (teamNames) {
      return translate('bulkInvite.teamNotFoundWithNames', {
        teams: teamNames,
      });
    }
  }
  const translationKey =
    TRANSLATION_KEYS[error.errorCode] ?? 'bulkInvite.validationError';
  return translate(translationKey);
}
