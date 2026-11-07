import { ROUTINE_PAUSE_AFTER_FAILURES } from './routines.constants';

export interface RoutineFailureNotificationText {
  headline: string;
  subheadline: string;
  body: string;
}

const CREDIT_REASONS = new Set([
  'CREDIT_BUDGET_EXCEEDED',
  'USER_CREDIT_LIMIT_EXCEEDED',
  'TEAM_CREDIT_LIMIT_EXCEEDED',
  'QUOTA_EXCEEDED',
]);

const MODEL_REASONS = new Set([
  'UNAUTHORIZED_ACCESS',
  'MODEL_NOT_FOUND',
  'RUN_NO_MODEL_FOUND',
]);

// The same wording as the failure reasons on the routines page.
const REASON_SENTENCES: Readonly<Record<string, string>> = {
  finish_routine_not_called:
    'Die Routine endete, ohne ihre Aufgabe abzuschließen.',
  timeout: 'Der Lauf dauerte zu lange und wurde abgebrochen.',
  interrupted: 'Der Lauf wurde unterbrochen.',
  ACADEMY_CERTIFICATE_REQUIRED:
    'Ihre Organisation setzt zuerst die KI-Schulung nach EU AI Act voraus.',
  ROUTINE_SUBSCRIPTION_REQUIRED:
    'Ein Abonnement oder verbleibende Testnachrichten sind erforderlich.',
  ROUTINE_OWNER_LOCKED: 'Ihr Konto ist gesperrt.',
  RUN_MAX_ITERATIONS_REACHED: 'Der Lauf hat sein Schrittlimit erreicht.',
};
const UNKNOWN_REASON = 'Etwas ist schiefgelaufen.';

/**
 * The inbox notification for a failed routine run, in German like the
 * other texts the backend writes to users (emails).
 */
export function routineFailureNotification(params: {
  routineName: string;
  failureReason: string;
  paused: boolean;
  hasRoutineThread: boolean;
  routinesUrl: string;
}): RoutineFailureNotificationText {
  const name = `„${params.routineName}“`;
  const paragraphs = [
    `Der Lauf der Routine „${escapeMarkdown(params.routineName)}“ ist fehlgeschlagen.`,
  ];
  if (params.hasRoutineThread) {
    paragraphs.push('Im Routine-Chat sehen Sie, was die Routine getan hat.');
  }
  if (params.paused) {
    paragraphs.push(
      `Die Routine ist nach ${ROUTINE_PAUSE_AFTER_FAILURES} fehlgeschlagenen Läufen in Folge pausiert und läuft nicht mehr täglich. Beheben Sie die Ursache und schalten Sie die Routine auf der Seite [Routinen](${params.routinesUrl}) wieder ein, um den täglichen Lauf fortzusetzen.`,
    );
  }
  return {
    headline: `Routine ${name} ${params.paused ? 'pausiert' : 'fehlgeschlagen'}`,
    subheadline: reasonSentence(params.failureReason),
    body: paragraphs.join('\n\n'),
  };
}

function reasonSentence(reason: string): string {
  if (CREDIT_REASONS.has(reason)) return 'Das Credit-Limit wurde erreicht.';
  if (MODEL_REASONS.has(reason)) {
    return 'Das Modell steht Ihnen nicht mehr zur Verfügung.';
  }
  return REASON_SENTENCES[reason] ?? UNKNOWN_REASON;
}

function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()<>#+\-!|~]/g, '\\$&');
}
