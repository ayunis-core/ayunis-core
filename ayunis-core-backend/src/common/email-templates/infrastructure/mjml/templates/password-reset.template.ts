import mjml2html from 'mjml';
import { PasswordResetTemplateContent } from '../../../domain/email-template.entity';

export function passwordResetText(template: PasswordResetTemplateContent) {
  const userNameText = template.userName
    ? `Hallo ${template.userName},`
    : 'Hallo,';

  return `${template.productName} – Passwort zurücksetzen
  
  ${userNameText}
  
  Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts für ${template.productName} gestellt.
  
  Um Ihr Passwort zurückzusetzen, klicken Sie bitte auf den folgenden Link:
  
  ${template.resetUrl}
  
  Dieser Link läuft in 24 Stunden ab. Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.
  
  Aus Sicherheitsgründen wird dieser Link nur einmal funktionieren. Nach dem Klicken können Sie ein neues Passwort festlegen.
  
  Diese E-Mail wurde gesendet an ${template.userEmail}
  
  Bei Fragen wenden Sie sich bitte an unser Support-Team unter support@ayunis.com
  
  ${template.currentYear} ${template.companyName} . Alle Rechte vorbehalten.
  `;
}

export function passwordResetHtml(template: PasswordResetTemplateContent) {
  const userNameText = template.userName
    ? `Hallo ${template.userName},`
    : 'Hallo,';

  return mjml2html(`
<mjml>
  <mj-head>
    <mj-title>Passwort zurücksetzen für ${template.productName}</mj-title>
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
          ${template.productName}
        </mj-text>
        <mj-divider border-color="#e5e7eb" border-width="1px" padding="16px 0" />
      </mj-column>
    </mj-section>

    <!-- Main Content -->
    <mj-section background-color="#ffffff" padding="32px 24px">
      <mj-column>
        <mj-text font-size="24px" font-weight="600" color="#4C1D95" align="center" padding-bottom="16px">
          Passwort zurücksetzen
        </mj-text>
        
        <mj-text color="#374151" padding-bottom="16px">
          ${userNameText}
        </mj-text>
        
        <mj-text color="#6b7280" padding-bottom="24px">
          Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts für <strong>${template.productName}</strong> gestellt. Um fortzufahren und ein neues Passwort festzulegen, klicken Sie bitte auf die Schaltfläche unten.
        </mj-text>
        
        <mj-button 
          background-color="#4C1D95" 
          color="#ffffff" 
          font-size="16px" 
          font-weight="600" 
          border-radius="8px" 
          href="${template.resetUrl}"
          css-class="reset-button"
        >
          Passwort zurücksetzen
        </mj-button>
        
        <mj-text align="center" color="#6b7280" font-size="14px" padding-top="24px">
          Falls die Schaltfläche oben nicht funktioniert, können Sie auch den folgenden Link kopieren und in Ihren Browser einfügen:
        </mj-text>
        
        <mj-text align="center" color="#3b82f6" font-size="14px" padding-top="8px">
          <a href="${template.resetUrl}" style="color: #4C1D95; text-decoration: none;">
            ${template.resetUrl}
          </a>
        </mj-text>
      </mj-column>
    </mj-section>

    <!-- Security Notice -->
    <mj-section background-color="#fef3c7" padding="20px 24px">
      <mj-column>
        <mj-text color="#92400e" font-size="14px" align="center">
          <strong>Wichtiger Sicherheitshinweis:</strong> Dieser Link läuft in 24 Stunden ab und kann nur einmal verwendet werden. Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.
        </mj-text>
      </mj-column>
    </mj-section>

    <!-- Help Section -->
    <mj-section background-color="#f0f9ff" padding="20px 24px">
      <mj-column>
        <mj-text color="#1e40af" font-size="14px" align="center">
          <strong>Probleme beim Zurücksetzen?</strong> Falls Sie weiterhin Schwierigkeiten haben, wenden Sie sich bitte an unser Support-Team unter support@ayunis.com
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
          Bei Fragen wenden Sie sich bitte an unser Support-Team unter support@ayunis.com
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
