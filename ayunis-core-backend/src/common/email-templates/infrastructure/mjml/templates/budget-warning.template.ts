import mjml2html from 'mjml';
import type {
  BudgetWarningScope,
  BudgetWarningTemplateContent,
} from '../../../domain/email-template.entity';
import {
  cta,
  divider,
  escapeText,
  fineprint,
  h1,
  p,
  renderLayout,
  teamSignoff,
} from './_layout';

function scopePhrasePlain(
  scope: BudgetWarningScope,
  targetName: string,
): string {
  if (scope === 'user') return `das monatliche Budget von ${targetName}`;
  if (scope === 'team') return `das monatliche Budget des Teams ${targetName}`;
  return 'Ihr Organisationsbudget';
}

function scopePhraseHtml(
  scope: BudgetWarningScope,
  targetName: string,
): string {
  const safe = escapeText(targetName);
  if (scope === 'user')
    return `das monatliche Budget von <strong>${safe}</strong>`;
  if (scope === 'team')
    return `das monatliche Budget des Teams <strong>${safe}</strong>`;
  return 'Ihr <strong>Organisationsbudget</strong>';
}

export function budgetWarningText(
  template: BudgetWarningTemplateContent,
): string {
  const greeting = template.recipientName
    ? `Hallo ${template.recipientName},`
    : 'Hallo,';
  const phrase = scopePhrasePlain(template.scope, template.targetName);
  return `${template.productName} – Budgetwarnung

${greeting}

mehr als ${template.threshold}% von ${phrase} sind aufgebraucht. Aktuell wurden ${template.percentUsed}% (${template.creditsUsed} von ${template.monthlyCredits} Credits) in diesem Monat verbraucht.

Sobald das Budget vollständig aufgebraucht ist, können keine weiteren Anfragen mehr ausgeführt werden. Budgets verwalten: ${template.settingsUrl}

Diese E-Mail wurde an ${template.recipientEmail} gesendet.
Dies ist eine automatische Benachrichtigung.

© ${template.currentYear} Ayunis / Locaboo GmbH. Alle Rechte vorbehalten.
`;
}

export function budgetWarningHtml(template: BudgetWarningTemplateContent) {
  const greeting = template.recipientName
    ? `Hallo ${escapeText(template.recipientName)},`
    : 'Hallo,';
  const phrase = scopePhraseHtml(template.scope, template.targetName);

  const body = [
    h1('Budgetwarnung'),
    p(greeting),
    p(
      `mehr als <strong>${template.threshold}%</strong> von ${phrase} sind aufgebraucht. Aktuell wurden <strong>${template.percentUsed}%</strong> (${template.creditsUsed} von ${template.monthlyCredits} Credits) in diesem Monat verbraucht.`,
    ),
    cta('Budgets verwalten', template.settingsUrl),
    fineprint(
      'Sobald das Budget vollständig aufgebraucht ist, können keine weiteren Anfragen mehr ausgeführt werden.',
    ),
    divider(),
    fineprint('Dies ist eine automatische Benachrichtigung.'),
    divider(),
    teamSignoff(template.teamUrl),
  ].join('\n');

  return mjml2html(
    renderLayout({
      title: `Budgetwarnung · ${template.productName}`,
      preheader: `Mehr als ${template.threshold}% des Budgets sind aufgebraucht.`,
      logoUrl: template.logoUrl,
      bodyMjml: body,
      footerEmail: template.recipientEmail,
      currentYear: template.currentYear,
    }),
  );
}
