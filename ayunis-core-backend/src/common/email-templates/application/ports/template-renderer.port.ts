import { EmailTemplate } from 'src/common/email-templates/domain/email-template.entity';
import { RenderedEmailContent } from 'src/common/email-templates/domain/rendered-email-content.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class TemplateRendererPort {
  abstract renderTemplate(template: EmailTemplate): RenderedEmailContent;
}
