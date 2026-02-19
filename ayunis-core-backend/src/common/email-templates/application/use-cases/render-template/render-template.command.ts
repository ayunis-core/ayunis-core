import type { EmailTemplate } from 'src/common/email-templates/domain/email-template.entity';

export class RenderTemplateCommand {
  constructor(public readonly template: EmailTemplate) {}
}
