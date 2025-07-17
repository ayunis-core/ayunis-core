import { EmailTemplateType } from './value-objects/email-template-type.enum';

export abstract class EmailTemplate {
  constructor(
    public readonly templateType: EmailTemplateType,
    public readonly templateContent: Record<string, string>,
  ) {}
}

export interface EmailConfirmationTemplateContent {
  confirmationUrl: string;
  userEmail: string;
  currentYear: string;
  companyName: string;
}

export class EmailConfirmationTemplate extends EmailTemplate {
  constructor(public readonly content: EmailConfirmationTemplateContent) {
    super(EmailTemplateType.EMAIL_CONFIRMATION, {
      confirmationUrl: content.confirmationUrl,
      userEmail: content.userEmail,
      currentYear: content.currentYear,
      companyName: content.companyName,
    });
  }
}
