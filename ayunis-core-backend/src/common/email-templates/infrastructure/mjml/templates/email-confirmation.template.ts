import mjml2html from 'mjml';
import { EmailConfirmationTemplateContent } from '../../../domain/email-template.entity';

export function emailConfirmationText(
  template: EmailConfirmationTemplateContent,
) {
  return `Ayunis Core – Bitte bestätigen Sie Ihre E-Mail-Adresse

  Vielen Dank für Ihre Anmeldung! Um Ihre Registrierung abzuschließen und Ayunis zu nutzen, bestätigen Sie bitte Ihre E-Mail-Adresse, indem Sie auf die Schaltfläche unten klicken.

  ${template.confirmationUrl}

  Dieser Bestätigungslink läuft in 24 Stunden ab. Falls Sie kein Konto bei Ayunis erstellt haben, können Sie diese E-Mail ignorieren.

  Diese E-Mail wurde gesendet an ${template.userEmail}

  Bei Fragen wenden Sie sich bitte an unser Support-Team unter help@ayunis.com

  ${template.currentYear} ${template.companyName} . Alle Rechte vorbehalten.
  `;
}

export function emailConfirmationHtml(
  template: EmailConfirmationTemplateContent,
) {
  return mjml2html(`
<mjml>
  <mj-head>
    <mj-title>E-Mail-Adresse bestätigen</mj-title>
    <mj-attributes>
      <mj-all font-family="Inter, Arial, sans-serif" />
      <mj-text font-weight="400" font-size="16px" color="#374151" line-height="1.6" />
      <mj-section background-color="#ffffff" padding="0" />
    </mj-attributes>
  </mj-head>

  <mj-body background-color="#f9fafb">
    <!-- Header -->
    <mj-section background-color="#ffffff" padding-top="32px" padding-bottom="0">
      <mj-column>
        <mj-text align="center" font-size="28px" font-weight="700" color="#1f2937" padding-bottom="8px">
          Ayunis Core
        </mj-text>
        <mj-divider border-color="#e5e7eb" border-width="1px" padding="16px 0" />
      </mj-column>
    </mj-section>

    <!-- Main Content -->
    <mj-section background-color="#ffffff" padding="32px 24px">
      <mj-column>
        <mj-text font-size="24px" font-weight="600" color="#4C1D95" align="center" padding-bottom="16px">
          Bitte bestätigen Sie Ihre E-Mail-Adresse
        </mj-text>

        <mj-text align="center" color="#6b7280" padding-bottom="24px">
          Vielen Dank für Ihre Anmeldung! Um Ihre Registrierung abzuschließen und Ayunis zu nutzen, bestätigen Sie bitte Ihre E-Mail-Adresse, indem Sie auf die Schaltfläche unten klicken.
        </mj-text>

        <mj-button
          background-color="#4C1D95"
          color="#ffffff"
          font-size="16px"
          font-weight="600"
          border-radius="8px"
          href="${template.confirmationUrl}"
          css-class="confirmation-button"
        >
          E-Mail-Adresse bestätigen
        </mj-button>
      </mj-column>
    </mj-section>

    <!-- Security Notice -->
    <mj-section background-color="#fef3c7" padding="20px 24px">
      <mj-column>
        <mj-text color="#92400e" font-size="14px" align="center">
          <strong>Sicherheitshinweis:</strong> Dieser Bestätigungslink läuft in 24 Stunden ab. Falls Sie kein Konto bei Ayunis erstellt haben, können Sie diese E-Mail ignorieren.
        </mj-text>
      </mj-column>
    </mj-section>

    <!-- Footer -->
    <mj-section background-color="#f9fafb" padding="32px 24px">
      <mj-column>
        <mj-divider border-color="#e5e7eb" border-width="1px" padding-bottom="24px" />

        <mj-text align="center" color="#6b7280" font-size="14px" padding-bottom="8px">
          Diese E-Mail wurde gesendet an ${template.userEmail}
        </mj-text>

        <mj-text align="center" color="#6b7280" font-size="14px" padding-bottom="16px">
          Bei Fragen wenden Sie sich bitte an unser Support-Team unter help@ayunis.com
        </mj-text>

        <mj-text align="center" color="#9ca3af" font-size="12px">
          © ${template.currentYear} ${template.companyName} . Alle Rechte vorbehalten.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`);
}
