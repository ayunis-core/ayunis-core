import mjml2html from 'mjml';
import type { PasswordResetTemplateContent } from '../../../domain/email-template.entity';
import {
  cta,
  divider,
  fineprint,
  h1,
  p,
  renderLayout,
  teamSignoff,
} from './_layout';

export function passwordResetText(
  template: PasswordResetTemplateContent,
): string {
  const greeting = template.userName ? `Hallo ${template.userName},` : 'Hallo,';
  return `${template.productName} – Passwort zurücksetzen

${greeting}

Sie haben angefragt, das Passwort für Ihr Ayunis-Core-Konto zurückzusetzen. Klicken Sie auf den Link unten, um ein neues Passwort festzulegen.

${template.resetUrl}

Der Link ist 24 Stunden gültig und kann nur einmal verwendet werden. Wenn Sie das nicht angefordert haben, ignorieren Sie diese E-Mail – Ihr Konto bleibt sicher.

Link abgelaufen? Neue E-Mail anfordern: ${template.forgotPasswordUrl}

Diese E-Mail wurde an ${template.userEmail} gesendet.
Bei Fragen: help@ayunis.com

© ${template.currentYear} Ayunis GmbH. Alle Rechte vorbehalten.
`;
}

export function passwordResetHtml(template: PasswordResetTemplateContent) {
  const greeting = template.userName ? `Hallo ${template.userName},` : 'Hallo,';

  const body = [
    h1('Passwort zurücksetzen'),
    p(greeting),
    p(
      `Sie haben angefragt, das Passwort für Ihr <strong>${template.productName}</strong>-Konto zurückzusetzen. Klicken Sie auf den Button unten, um ein neues Passwort festzulegen.`,
    ),
    cta('Neues Passwort festlegen', template.resetUrl),
    fineprint(
      'Der Link ist 24 Stunden gültig und kann nur einmal verwendet werden. Wenn Sie das nicht angefordert haben, ignorieren Sie diese E-Mail – Ihr Konto bleibt sicher.',
    ),
    divider(),
    fineprint(
      `Link abgelaufen? <a href="${template.forgotPasswordUrl}">Neue E-Mail anfordern</a>.`,
    ),
    divider(),
    teamSignoff(template.teamUrl),
  ].join('\n');

  return mjml2html(
    renderLayout({
      title: `Passwort zurücksetzen · ${template.productName}`,
      preheader:
        'Setzen Sie Ihr Passwort zurück. Der Link ist 24 Stunden gültig.',
      logoUrl: template.logoUrl,
      bodyMjml: body,
      footerEmail: template.userEmail,
      currentYear: template.currentYear,
    }),
  );
}
