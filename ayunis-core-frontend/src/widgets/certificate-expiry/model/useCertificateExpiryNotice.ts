import { useCallback, useState } from 'react';
import { AcademyAccessMode } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useAcademyAccessStatus } from '@/features/academy';
import type { CertificateExpiryNoticeLevel } from '@/features/academy';
import { resolveCertificateExpiryNotice } from '@/features/academy';

const DISMISSED_KEY_PREFIX = 'academy_certificate_notice_dismissed';

/**
 * Dismissals are keyed by the expiry they were shown for, so renewing —  which
 * moves `expiresAt` twelve months out — makes every earlier dismissal
 * irrelevant without anything having to clear it.
 */
function dismissalKey(expiresAt: string, level: string): string {
  return `${DISMISSED_KEY_PREFIX}:${expiresAt}:${level}`;
}

function readDismissed(key: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(key) === 'true';
}

interface CertificateExpiryNoticeState {
  /**
   * Which warning the expiry date calls for, independent of whether it is
   * currently shown. Dismissing must not change it: a dialog derives its copy
   * and styling from the level, and collapsing it on dismiss would rewrite both
   * while the close animation is still playing.
   */
  level: CertificateExpiryNoticeLevel;
  daysRemaining: number;
  /** Whether the user has already waved this expiry's warning away. */
  isDismissed: boolean;
  dismiss: () => void;
}

export function useCertificateExpiryNotice(): CertificateExpiryNoticeState {
  const { status } = useAcademyAccessStatus();
  const [dismissedAt, setDismissedAt] = useState<string | null>(null);

  // Only the annual mode populates `expiresAt`, which is what keeps the
  // notifications out of the other two modes.
  const expiresAt =
    status?.mode === AcademyAccessMode.required_annually
      ? (status.expiresAt ?? null)
      : null;

  // The server owns the verdict on whether the certificate still counts, so a
  // lapsed one warns about nothing: the gate notice already says chat is
  // locked, and counting down to a deadline it has enforced would contradict
  // it. Only the client clock knows how far away a *future* expiry is, but it
  // must not be the one deciding that expiry has happened.
  const lapsed = status?.allowed === false;

  const { level, daysRemaining } = resolveCertificateExpiryNotice(
    lapsed || expiresAt === null ? null : new Date(expiresAt),
    new Date(),
  );

  const key =
    expiresAt === null ? null : dismissalKey(String(expiresAt), level);

  const dismiss = useCallback(() => {
    if (key === null) return;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, 'true');
    }
    setDismissedAt(key);
  }, [key]);

  // Only the two pop-ups can be dismissed; the final banner has no control to
  // do it, so no dismissal is ever stored for that level.
  const dismissible = level === 'month' || level === 'twoWeeks';

  return {
    level,
    daysRemaining,
    isDismissed:
      dismissible &&
      key !== null &&
      (dismissedAt === key || readDismissed(key)),
    dismiss,
  };
}
