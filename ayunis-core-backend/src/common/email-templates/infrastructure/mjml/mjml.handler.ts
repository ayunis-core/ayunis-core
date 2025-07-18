import { TemplateRendererPort } from '../../application/ports/template-renderer.port';
import {
  EmailConfirmationTemplate,
  EmailInvitationTemplate,
  EmailTemplate,
} from '../../domain/email-template.entity';
import { Injectable } from '@nestjs/common';
import {
  emailConfirmationHtml,
  emailConfirmationText,
} from './templates/email-confirmation.template';
import {
  emailInvitationHtml,
  emailInvitationText,
} from './templates/email-invitation.template';
import { RenderedEmailContent } from '../../domain/rendered-email-content.entity';

@Injectable()
export class MjmlHandler implements TemplateRendererPort {
  renderTemplate(template: EmailTemplate): RenderedEmailContent {
    if (template instanceof EmailConfirmationTemplate) {
      return new RenderedEmailContent({
        html: emailConfirmationHtml(template.content).html,
        text: emailConfirmationText(template.content),
      });
    }
    if (template instanceof EmailInvitationTemplate) {
      return new RenderedEmailContent({
        html: emailInvitationHtml(template.content).html,
        text: emailInvitationText(template.content),
      });
    }
    throw new Error(`Template type ${template.templateType} not supported`);
  }
}
