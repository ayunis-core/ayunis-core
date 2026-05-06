import mjml2html from 'mjml';
import type { InvitationTemplateContent } from '../../../domain/email-template.entity';
import {
  cta,
  divider,
  fineprint,
  h1,
  p,
  renderLayout,
  teamSignoff,
} from './_layout';

function preheader(template: InvitationTemplateContent): string {
  const inviter = template.adminName
    ? `${template.adminName} hat`
    : 'Sie wurden';
  return `${inviter} Sie zu ${template.productName} eingeladen. Konto in wenigen Schritten einrichten.`;
}

export function invitationText(template: InvitationTemplateContent): string {
  const inviterLine = template.adminName
    ? `${template.adminName} hat Sie zu ${template.invitingCompanyName} eingeladen.`
    : `Sie wurden zu ${template.invitingCompanyName} eingeladen.`;

  return `${template.productName} – Willkommen!

${inviterLine}

${template.productName} ist Ihre zentrale KI-Plattform – sicher, DSGVO-konform und passgenau für die deutsche Verwaltung entwickelt. Analysieren Sie Dokumente, erstellen Sie Texte und greifen Sie effizient auf Wissen aus Ihren eigenen Quellen zu.

Im nächsten Schritt ergänzen Sie Ihren Namen, vergeben ein Passwort und wählen Ihre Abteilung – danach können Sie direkt loslegen.

Einladung annehmen: ${template.invitationUrl}

Diese Einladung ist 7 Tage gültig. Wenn Sie diese E-Mail nicht erwartet haben, können Sie sie ignorieren.

Diese E-Mail wurde an ${template.userEmail} gesendet.
Bei Fragen: help@ayunis.com

© ${template.currentYear} Ayunis GmbH. Alle Rechte vorbehalten.
`;
}

export function invitationHtml(template: InvitationTemplateContent) {
  const inviterLine = template.adminName
    ? `<strong>${template.adminName}</strong> hat Sie zu <strong>${template.invitingCompanyName}</strong> eingeladen.`
    : `Sie wurden zu <strong>${template.invitingCompanyName}</strong> eingeladen.`;

  const body = [
    h1(`Willkommen bei ${template.productName}!`),
    p(inviterLine),
    p(
      `${template.productName} ist Ihre zentrale KI-Plattform – sicher, DSGVO-konform und passgenau für die deutsche Verwaltung entwickelt. Analysieren Sie Dokumente, erstellen Sie Texte und greifen Sie effizient auf Wissen aus Ihren eigenen Quellen zu.`,
    ),
    p(
      'Im nächsten Schritt ergänzen Sie Ihren Namen, vergeben ein Passwort und wählen Ihre Abteilung – danach können Sie direkt loslegen.',
    ),
    cta('Einladung annehmen', template.invitationUrl),
    fineprint(
      'Diese Einladung ist 7 Tage gültig. Wenn Sie diese E-Mail nicht erwartet haben, können Sie sie ignorieren.',
    ),
    divider(),
    teamSignoff(template.teamUrl),
  ].join('\n');

  return mjml2html(
    renderLayout({
      title: `Einladung zu ${template.invitingCompanyName} · ${template.productName}`,
      preheader: preheader(template),
      logoUrl: template.logoUrl,
      bannerUrl: template.bannerUrl,
      bannerAlt: `${template.productName} – Die Plattform, auf der moderne Kommunen laufen.`,
      bodyMjml: body,
      footerEmail: template.userEmail,
      currentYear: template.currentYear,
    }),
  );
}
