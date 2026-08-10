/**
 * The escalating warnings a member gets before their certificate lapses. Only
 * ever raised where the org requires annual renewal — nothing expires in the
 * other two modes.
 */
export type CertificateExpiryNoticeLevel =
  | 'none'
  /** Dismissible pop-up, one month out. */
  | 'month'
  /** Red pop-up, two weeks out. */
  | 'twoWeeks'
  /** Non-dismissible banner counting down the final week. */
  | 'countdown';

export const MONTH_NOTICE_DAYS = 30;
export const TWO_WEEKS_NOTICE_DAYS = 14;
export const COUNTDOWN_NOTICE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CertificateExpiryNotice {
  level: CertificateExpiryNoticeLevel;
  /** Whole days left, rounded up, so the final day still reads "1 day". */
  daysRemaining: number;
}

export function resolveCertificateExpiryNotice(
  expiresAt: Date | null,
  now: Date,
): CertificateExpiryNotice {
  if (expiresAt === null) {
    return { level: 'none', daysRemaining: 0 };
  }

  const daysRemaining = Math.ceil(
    (expiresAt.getTime() - now.getTime()) / DAY_MS,
  );

  return { level: resolveLevel(daysRemaining), daysRemaining };
}

function resolveLevel(daysRemaining: number): CertificateExpiryNoticeLevel {
  // Once the certificate has actually lapsed the gate notice takes over and
  // says chat is locked — a countdown to a moment already past would be noise.
  if (daysRemaining <= 0) {
    return 'none';
  }
  if (daysRemaining <= COUNTDOWN_NOTICE_DAYS) {
    return 'countdown';
  }
  if (daysRemaining <= TWO_WEEKS_NOTICE_DAYS) {
    return 'twoWeeks';
  }
  if (daysRemaining <= MONTH_NOTICE_DAYS) {
    return 'month';
  }
  return 'none';
}
