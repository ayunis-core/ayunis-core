import mjml2html from 'mjml';
import type { MJMLParseResults } from 'mjml-core';

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

type BudgetWarningViewModel = Readonly<{
  isExhausted: boolean;
  headline: string;
  greetingText: string;
  greetingHtml: string;
  bodyText: string;
  bodyHtml: string;
  availabilityNote: string;
  preheader: string;
}>;

type ScopeCopy = Readonly<{
  warningText: string;
  warningHtml: string;
  exhaustedText: string;
  exhaustedHtml: string;
}>;

function normalizeInlineText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function assertNever(value: never): never {
  throw new Error(`Unsupported budget warning scope: ${String(value)}`);
}

function getScopeCopy(
  scope: BudgetWarningScope,
  targetName: string,
): ScopeCopy {
  const normalizedName = normalizeInlineText(targetName);
  const escapedName = escapeText(normalizedName);

  switch (scope) {
    case BudgetWarningScope.USER:
      return {
        warningText: `des monatlichen Budgets von ${normalizedName}`,
        warningHtml: `des monatlichen Budgets von <strong>${escapedName}</strong>`,
        exhaustedText: `das monatliche Budget von ${normalizedName}`,
        exhaustedHtml: `das monatliche Budget von <strong>${escapedName}</strong>`,
      };

    case BudgetWarningScope.TEAM:
      return {
        warningText: `des monatlichen Budgets des Teams ${normalizedName}`,
        warningHtml: `des monatlichen Budgets des Teams <strong>${escapedName}</strong>`,
        exhaustedText: `das monatliche Budget des Teams ${normalizedName}`,
        exhaustedHtml: `das monatliche Budget des Teams <strong>${escapedName}</strong>`,
      };

    case BudgetWarningScope.ORG:
      return {
        warningText: 'Ihres Organisationsbudgets',
        warningHtml: 'Ihres <strong>Organisationsbudgets</strong>',
        exhaustedText: 'Ihr Organisationsbudget',
        exhaustedHtml: 'Ihr <strong>Organisationsbudget</strong>',
      };

    default:
      return assertNever(scope);
  }
}

function createViewModel(
  template: BudgetWarningTemplateContent,
): BudgetWarningViewModel {
  const threshold = Number(template.threshold);
  const exhausted = threshold >= 100;
  const headline = exhausted ? 'Budget aufgebraucht' : 'Budgetwarnung';
  const scopeCopy = getScopeCopy(template.scope, template.targetName);

  const normalizedRecipientName = template.recipientName
    ? normalizeInlineText(template.recipientName)
    : null;

  const greetingText = normalizedRecipientName
    ? `Hallo ${normalizedRecipientName},`
    : 'Hallo,';

  const greetingHtml = normalizedRecipientName
    ? `Hallo ${escapeText(normalizedRecipientName)},`
    : 'Hallo,';

  if (exhausted) {
    return {
      isExhausted: true,
      headline,
      greetingText,
      greetingHtml,
      bodyText: `${scopeCopy.exhaustedText} ist vollständig aufgebraucht.`,
      bodyHtml: `${scopeCopy.exhaustedHtml} ist vollständig aufgebraucht.`,
      availabilityNote: 'Es sind nicht mehr alle Modelle im Chat verfügbar.',
      preheader: 'Das Budget ist vollständig aufgebraucht.',
    };
  }

  return {
    isExhausted: false,
    headline,
    greetingText,
    greetingHtml,
    bodyText: `mindestens ${threshold}% ${scopeCopy.warningText} sind aufgebraucht.`,
    bodyHtml: `mindestens <strong>${threshold}%</strong> ${scopeCopy.warningHtml} sind aufgebraucht.`,
    availabilityNote:
      'Sobald das Budget aufgebraucht ist, sind nicht mehr alle Modelle im Chat verfügbar.',
    preheader: `Mindestens ${threshold}% des Budgets sind aufgebraucht.`,
  };
}

export function budgetWarningText(
  template: BudgetWarningTemplateContent,
): string {
  const view = createViewModel(template);

  return [
    `${normalizeInlineText(template.productName)} – ${view.headline}`,
    '',
    view.greetingText,
    '',
    view.bodyText,
    '',
    `${view.availabilityNote} Budgets verwalten: ${template.settingsUrl}`,
    '',
    `Diese E-Mail wurde an ${normalizeInlineText(template.recipientEmail)} gesendet.`,
    'Dies ist eine automatische Benachrichtigung.',
    '',
    `© ${template.currentYear} Ayunis / Locaboo GmbH. Alle Rechte vorbehalten.`,
    '',
  ].join('\n');
}

export function budgetWarningHtml(
  template: BudgetWarningTemplateContent,
): MJMLParseResults {
  const view = createViewModel(template);

  const bodyMjml = [
    h1(view.headline),
    p(view.greetingHtml),
    p(view.bodyHtml),
    cta('Budgets verwalten', template.settingsUrl),
    fineprint(view.availabilityNote),
    divider(),
    teamSignoff(template.teamUrl),
  ].join('\n');

  return mjml2html(
    renderLayout({
      title: `${view.headline} · ${normalizeInlineText(template.productName)}`,
      preheader: view.preheader,
      logoUrl: template.logoUrl,
      bodyMjml,
      footerEmail: template.recipientEmail,
      currentYear: template.currentYear,
      automatedNotice: true,
    }),
  );
}
