import { describe, expect, it } from 'vitest';
import type { ParsedInvite } from './csv-utils';
import { applyValidationErrors } from './apply-validation-errors';

const invite: ParsedInvite = {
  email: 'invited@example.com',
  role: 'user',
  teamNames: [],
  rowNumber: 2,
  isValid: true,
};

const translations: Record<string, string> = {
  'bulkInvite.duplicateEmail': 'Doppelte E-Mail in der Datei',
  'inviteCreate.emailProviderBlacklisted':
    'Private E-Mail-Adressen sind nicht erlaubt',
  'bulkInvite.emailAlreadyInvited':
    'E-Mail hat bereits eine ausstehende Einladung',
  'bulkInvite.emailAlreadyUser':
    'E-Mail ist bereits ein Benutzer in dieser Organisation',
  'bulkInvite.teamNotFound': 'Mindestens ein Team wurde nicht gefunden',
  'bulkInvite.teamNotFoundWithNames': 'Nicht gefundene Teams: {{teams}}',
  'bulkInvite.validationError': 'Einladung konnte nicht validiert werden',
};

const translate = (key: string, values?: Record<string, string>) =>
  (translations[key] ?? key).replace('{{teams}}', values?.teams ?? '');

describe(applyValidationErrors.name, () => {
  it.each([
    ['DUPLICATE_EMAIL_IN_REQUEST', 'Doppelte E-Mail in der Datei'],
    [
      'EMAIL_PROVIDER_BLACKLISTED',
      'Private E-Mail-Adressen sind nicht erlaubt',
    ],
    ['EMAIL_ALREADY_INVITED', 'E-Mail hat bereits eine ausstehende Einladung'],
    [
      'EMAIL_ALREADY_USER',
      'E-Mail ist bereits ein Benutzer in dieser Organisation',
    ],
    ['TEAM_NOT_FOUND', 'Nicht gefundene Teams: Unknown Team'],
  ])('localizes %s by its stable error code', (errorCode, expected) => {
    const result = applyValidationErrors(
      [invite],
      [
        {
          row: 1,
          email: invite.email,
          errorCode,
          message:
            errorCode === 'TEAM_NOT_FOUND'
              ? 'Unknown team: Unknown Team'
              : 'Backend message in English',
        },
      ],
      translate,
    );

    expect(result[0]).toMatchObject({
      isValid: false,
      serverError: expected,
    });
  });

  it('uses a localized fallback for unknown backend error codes', () => {
    const result = applyValidationErrors(
      [invite],
      [
        {
          row: 1,
          email: invite.email,
          errorCode: 'FUTURE_VALIDATION_ERROR',
          message: 'A future English-only message',
        },
      ],
      translate,
    );

    expect(result[0]?.serverError).toBe(
      'Einladung konnte nicht validiert werden',
    );
  });

  it('keeps every localized validation error reported for the same row', () => {
    const result = applyValidationErrors(
      [invite],
      [
        {
          row: 1,
          email: invite.email,
          errorCode: 'EMAIL_ALREADY_INVITED',
          message: 'Backend email message in English',
        },
        {
          row: 1,
          email: invite.email,
          errorCode: 'TEAM_NOT_FOUND',
          message: 'Unknown team: Unknown Team',
        },
      ],
      translate,
    );

    expect(result[0]?.serverError).toBe(
      'E-Mail hat bereits eine ausstehende Einladung; Nicht gefundene Teams: Unknown Team',
    );
  });
});
