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

export interface EmailInvitationTemplateContent {
  invitationUrl: string;
  userEmail: string;
  invitingCompanyName: string;
  productName: string;
  currentYear: string;
  adminName?: string;
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

export class EmailInvitationTemplate extends EmailTemplate {
  constructor(public readonly content: EmailInvitationTemplateContent) {
    super(EmailTemplateType.INVITATION, {
      invitationUrl: content.invitationUrl,
      userEmail: content.userEmail,
      invitingCompanyName: content.invitingCompanyName,
      productName: content.productName,
      currentYear: content.currentYear,
      adminName: content.adminName || '',
    });
  }
}
