import mjml2html from 'mjml';
import type { MJMLParseResults } from 'mjml-core';

import type { BudgetWarningTemplateContent } from '../../../domain/email-template.entity';
import {
  buildBudgetWarningMessage,
  type BudgetWarningMessage,
} from './budget-warning.messages';
import {
  cta,
  divider,
  escapeText,
  h1,
  p,
  renderLayout,
  teamSignoff,
} from './_layout';

function normalizeInlineText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function messageFor(
  template: BudgetWarningTemplateContent,
): BudgetWarningMessage {
  const targetName = normalizeInlineText(template.targetName);
  return buildBudgetWarningMessage({
    scope: template.scope,
    threshold: Number(template.threshold),
    targetName: { text: targetName, html: escapeText(targetName) },
    settingsUrl: template.settingsUrl,
  });
}

function greeting(recipientName: string | null): {
  text: string;
  html: string;
} {
  const normalized = recipientName ? normalizeInlineText(recipientName) : '';
  if (!normalized) {
    return { text: 'Hallo,', html: 'Hallo,' };
  }
  return {
    text: `Hallo ${normalized},`,
    html: `Hallo ${escapeText(normalized)},`,
  };
}

export function budgetWarningSubject(
  template: BudgetWarningTemplateContent,
): string {
  return messageFor(template).subject;
}

export function budgetWarningText(
  template: BudgetWarningTemplateContent,
): string {
  const message = messageFor(template);
  const greet = greeting(template.recipientName);

  return [
    `${normalizeInlineText(template.productName)} – ${message.headline}`,
    '',
    greet.text,
    '',
    ...message.paragraphs.flatMap((paragraph) => [paragraph.text, '']),
    `${message.settingsLinkLabel}: ${template.settingsUrl}`,
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
  const message = messageFor(template);
  const greet = greeting(template.recipientName);

  const bodyMjml = [
    h1(message.headline),
    p(greet.html),
    ...message.paragraphs.map((paragraph) => p(paragraph.html)),
    cta(message.ctaLabel, template.settingsUrl),
    divider(),
    teamSignoff(template.teamUrl),
  ].join('\n');

  return mjml2html(
    renderLayout({
      title: `${message.headline} · ${normalizeInlineText(template.productName)}`,
      preheader: message.preheader,
      logoUrl: template.logoUrl,
      bodyMjml,
      footerEmail: template.recipientEmail,
      currentYear: template.currentYear,
      automatedNotice: true,
    }),
  );
}
