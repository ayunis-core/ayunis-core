import mjml2html from 'mjml';
import type { SetInitialPasswordTemplateContent } from '../../../domain/email-template.entity';
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

export function setInitialPasswordText(
  template: SetInitialPasswordTemplateContent,
): string {
  return `${template.productName} – Willkommen!

Hallo ${template.userName},

${template.invitingCompanyName} hat ein Konto für Sie bei ${template.productName} angelegt. Legen Sie nur noch ein Passwort fest, um Ihr Konto zu aktivieren – danach können Sie direkt loslegen.

Konto aktivieren: ${template.resetUrl}

Der Link ist 7 Tage gültig. Sollten Sie das nicht erwartet haben, wenden Sie sich an help@ayunis.com.

Diese E-Mail wurde an ${template.userEmail} gesendet.

© ${template.currentYear} Ayunis / Locaboo GmbH. Alle Rechte vorbehalten.
`;
}

export function setInitialPasswordHtml(
  template: SetInitialPasswordTemplateContent,
) {
  const userName = escapeText(template.userName);
  const companyName = escapeText(template.invitingCompanyName);

  const body = [
    h1(`Willkommen bei ${template.productName}!`),
    p(`Hallo ${userName},`),
    p(
      `<strong>${companyName}</strong> hat ein Konto für Sie bei ${template.productName} angelegt. Legen Sie nur noch ein Passwort fest, um Ihr Konto zu aktivieren – danach können Sie direkt loslegen.`,
    ),
    cta('Konto aktivieren', template.resetUrl),
    fineprint(
      'Der Link ist 7 Tage gültig. Sollten Sie das nicht erwartet haben, wenden Sie sich an <a href="mailto:help@ayunis.com">help@ayunis.com</a>.',
    ),
    divider(),
    teamSignoff(template.teamUrl),
  ].join('\n');

  return mjml2html(
    renderLayout({
      title: `Konto bei ${template.invitingCompanyName} eingerichtet · ${template.productName}`,
      preheader: `${template.invitingCompanyName} hat ein Konto für Sie angelegt. Legen Sie jetzt Ihr Passwort fest.`,
      logoUrl: template.logoUrl,
      bannerUrl: template.bannerUrl,
      bannerAlt: `${template.productName} – Die Plattform, auf der moderne Kommunen laufen.`,
      bodyMjml: body,
      footerEmail: template.userEmail,
      currentYear: template.currentYear,
    }),
  );
}
