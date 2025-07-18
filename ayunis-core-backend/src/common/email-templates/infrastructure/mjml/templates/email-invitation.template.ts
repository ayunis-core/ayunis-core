import mjml2html from 'mjml';
import { EmailInvitationTemplateContent } from '../../../domain/email-template.entity';

export function emailInvitationText(template: EmailInvitationTemplateContent) {
  const adminNameText = template.adminName ? ` von ${template.adminName}` : '';

  return `${template.productName} – Einladung zu ${template.invitingCompanyName}
  
  Sie wurden${adminNameText} zu ${template.invitingCompanyName} eingeladen, um ${template.productName} zu nutzen.
  
  Um der Organisation beizutreten und Ihren Zugang zu aktivieren, klicken Sie bitte auf den folgenden Link:
  
  ${template.invitationUrl}
  
  Diese Einladung läuft in 7 Tagen ab. Falls Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren.
  
  Diese E-Mail wurde gesendet an ${template.userEmail}
  
  Bei Fragen wenden Sie sich bitte an unser Support-Team unter support@ayunis.com
  
  ${template.currentYear} ${template.invitingCompanyName} . Alle Rechte vorbehalten.
  `;
}

export function emailInvitationHtml(template: EmailInvitationTemplateContent) {
  const adminNameText = template.adminName ? ` von ${template.adminName}` : '';

  return mjml2html(`
<mjml>
  <mj-head>
    <mj-title>Einladung zu ${template.invitingCompanyName}</mj-title>
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
          Einladung zu ${template.invitingCompanyName}
        </mj-text>
        
        <mj-text align="center" color="#6b7280" padding-bottom="24px">
          Sie wurden${adminNameText} zu <strong>${template.invitingCompanyName}</strong> eingeladen, um ${template.productName} zu nutzen. Diese Plattform ermöglicht es Ihnen, mit KI-gestützten Tools effizient zu arbeiten.
        </mj-text>
        
        <mj-button 
          background-color="#4C1D95" 
          color="#ffffff" 
          font-size="16px" 
          font-weight="600" 
          border-radius="8px" 
          href="${template.invitationUrl}"
          css-class="invitation-button"
        >
          Einladung annehmen
        </mj-button>
        
        <mj-text align="center" color="#6b7280" font-size="14px" padding-top="24px">
          Falls die Schaltfläche oben nicht funktioniert, können Sie auch den folgenden Link kopieren und in Ihren Browser einfügen:
        </mj-text>
        
        <mj-text align="center" color="#3b82f6" font-size="14px" padding-top="8px">
          <a href="${template.invitationUrl}" style="color: #4C1D95; text-decoration: none;">
            ${template.invitationUrl}
          </a>
        </mj-text>
      </mj-column>
    </mj-section>

    <!-- Welcome Message -->
    <mj-section background-color="#f0f9ff" padding="20px 24px">
      <mj-column>
        <mj-text color="#1e40af" font-size="14px" align="center">
          <strong>Willkommen bei ${template.productName}!</strong> Nach der Registrierung haben Sie Zugang zu fortschrittlichen KI-Tools und können sofort mit Ihrer Arbeit beginnen.
        </mj-text>
      </mj-column>
    </mj-section>

    <!-- Security Notice -->
    <mj-section background-color="#fef3c7" padding="20px 24px">
      <mj-column>
        <mj-text color="#92400e" font-size="14px" align="center">
          <strong>Wichtiger Hinweis:</strong> Diese Einladung läuft in 7 Tagen ab. Falls Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren.
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
          © ${template.currentYear} ${template.invitingCompanyName} . Alle Rechte vorbehalten.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`);
}
