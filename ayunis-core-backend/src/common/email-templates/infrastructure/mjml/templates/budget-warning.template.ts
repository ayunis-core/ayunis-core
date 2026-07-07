import mjml2html from 'mjml';
import type { BudgetWarningTemplateContent } from '../../../domain/email-template.entity';
import { BudgetWarningScope } from '../../../domain/value-objects/budget-warning-scope.enum';
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

// Display names are user input; collapse whitespace so a crafted name cannot
// inject its own lines into the plain-text email.
function inlineName(value: string): string {
  return value.split(/\s+/).filter(Boolean).join(' ');
}

// Genitive phrases — the body embeds them as "mindestens X% ${phrase} sind aufgebraucht".
function scopePhrasePlain(
  scope: BudgetWarningScope,
  targetName: string,
): string {
  if (scope === BudgetWarningScope.USER)
    return `des monatlichen Budgets von ${targetName}`;
  if (scope === BudgetWarningScope.TEAM)
    return `des monatlichen Budgets des Teams ${targetName}`;
  return 'Ihres Organisationsbudgets';
}

function scopePhraseHtml(
  scope: BudgetWarningScope,
  targetName: string,
): string {
  const safe = escapeText(targetName);
  if (scope === BudgetWarningScope.USER)
    return `des monatlichen Budgets von <strong>${safe}</strong>`;
  if (scope === BudgetWarningScope.TEAM)
    return `des monatlichen Budgets des Teams <strong>${safe}</strong>`;
  return 'Ihres <strong>Organisationsbudgets</strong>';
}

export function budgetWarningText(
  template: BudgetWarningTemplateContent,
): string {
  const greeting = template.recipientName
    ? `Hallo ${inlineName(template.recipientName)},`
    : 'Hallo,';
  const phrase = scopePhrasePlain(
    template.scope,
    inlineName(template.targetName),
  );
  return `${template.productName} – Budgetwarnung

${greeting}

mindestens ${template.threshold}% ${phrase} sind aufgebraucht. Aktuell wurden ${template.percentUsed}% (${template.creditsUsed} von ${template.monthlyCredits} Credits) in diesem Monat verbraucht.

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
      `mindestens <strong>${template.threshold}%</strong> ${phrase} sind aufgebraucht. Aktuell wurden <strong>${template.percentUsed}%</strong> (${template.creditsUsed} von ${template.monthlyCredits} Credits) in diesem Monat verbraucht.`,
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
      preheader: `Mindestens ${template.threshold}% des Budgets sind aufgebraucht.`,
      logoUrl: template.logoUrl,
      bodyMjml: body,
      footerEmail: template.recipientEmail,
      currentYear: template.currentYear,
    }),
  );
}
