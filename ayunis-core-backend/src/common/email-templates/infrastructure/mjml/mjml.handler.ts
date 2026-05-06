import { TemplateRendererPort } from '../../application/ports/template-renderer.port';
import {
  EmailConfirmationTemplate,
  EmailTemplate,
  FirstStepsTemplate,
  InvitationTemplate,
  PasswordResetTemplate,
  SetInitialPasswordTemplate,
} from '../../domain/email-template.entity';
import { Injectable } from '@nestjs/common';
import {
  emailConfirmationHtml,
  emailConfirmationText,
} from './templates/email-confirmation.template';
import {
  invitationHtml,
  invitationText,
} from './templates/invitation.template';
import {
  passwordResetHtml,
  passwordResetText,
} from './templates/password-reset.template';
import {
  setInitialPasswordHtml,
  setInitialPasswordText,
} from './templates/set-initial-password.template';
import {
  firstStepsHtml,
  firstStepsText,
} from './templates/first-steps.template';
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
    if (template instanceof InvitationTemplate) {
      return new RenderedEmailContent({
        html: invitationHtml(template.content).html,
        text: invitationText(template.content),
      });
    }
    if (template instanceof PasswordResetTemplate) {
      return new RenderedEmailContent({
        html: passwordResetHtml(template.content).html,
        text: passwordResetText(template.content),
      });
    }
    if (template instanceof SetInitialPasswordTemplate) {
      return new RenderedEmailContent({
        html: setInitialPasswordHtml(template.content).html,
        text: setInitialPasswordText(template.content),
      });
    }
    if (template instanceof FirstStepsTemplate) {
      return new RenderedEmailContent({
        html: firstStepsHtml(template.content).html,
        text: firstStepsText(template.content),
      });
    }
    throw new Error(`Template type ${template.templateType} not supported`);
  }
}
