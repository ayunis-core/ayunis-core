export interface ValidationError {
  row: number;
  email: string;
  errorCode: string;
  message: string;
}

interface InviteInput {
  email: string;
}

interface InviteRowContext {
  emailRows: Map<string, number[]>;
  existingInviteEmails: Set<string>;
  registeredUserEmails: Set<string>;
  emailProviderBlacklist: string[];
}

/**
 * Group the 1-indexed request rows by their lowercased email so duplicates and
 * per-row lookups can be resolved case-insensitively.
 */
export function groupInviteRowsByEmail(
  invites: InviteInput[],
): Map<string, number[]> {
  const emailRows = new Map<string, number[]>();
  invites.forEach((invite, index) => {
    const email = invite.email.toLowerCase();
    const rows = emailRows.get(email) ?? [];
    rows.push(index + 1);
    emailRows.set(email, rows);
  });
  return emailRows;
}

export function collectDuplicateEmailErrors(
  emailRows: Map<string, number[]>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  emailRows.forEach((rows, email) => {
    if (rows.length <= 1) {
      return;
    }
    // Report every duplicate occurrence except the first.
    rows.slice(1).forEach((row) => {
      errors.push({
        row,
        email,
        errorCode: 'DUPLICATE_EMAIL_IN_REQUEST',
        message: `Duplicate email in request (first occurrence at row ${rows[0]})`,
      });
    });
  });
  return errors;
}

export function collectInviteRowErrors(
  invites: InviteInput[],
  context: InviteRowContext,
): ValidationError[] {
  const errors: ValidationError[] = [];
  invites.forEach((invite, index) => {
    const rowNumber = index + 1;
    const email = invite.email.toLowerCase();

    // Skip non-first occurrences of a duplicated email; they are already
    // reported by collectDuplicateEmailErrors.
    const rows = context.emailRows.get(email) ?? [];
    if (rows.length > 1 && rows[0] !== rowNumber) {
      return;
    }

    const rowError = validateInviteRow(invite, rowNumber, context);
    if (rowError) {
      errors.push(rowError);
    }
  });
  return errors;
}

function validateInviteRow(
  invite: InviteInput,
  rowNumber: number,
  context: InviteRowContext,
): ValidationError | null {
  const email = invite.email.toLowerCase();

  const emailProvider = email.split('@')[1]?.split('.')[0];
  if (emailProvider && context.emailProviderBlacklist.includes(emailProvider)) {
    return {
      row: rowNumber,
      email: invite.email,
      errorCode: 'EMAIL_PROVIDER_BLACKLISTED',
      message: 'Email provider is not allowed',
    };
  }

  // Existing invite in any org, pending or accepted (invites.email is globally
  // unique, so any conflicting row would otherwise fail the insert; AYC-735).
  if (context.existingInviteEmails.has(email)) {
    return {
      row: rowNumber,
      email: invite.email,
      errorCode: 'EMAIL_ALREADY_INVITED',
      message: 'Email already has an invite',
    };
  }

  if (context.registeredUserEmails.has(email)) {
    return {
      row: rowNumber,
      email: invite.email,
      errorCode: 'EMAIL_ALREADY_USER',
      message: 'Email is already registered as a user',
    };
  }

  return null;
}
