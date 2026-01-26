import { EmailTemplateType } from './value-objects/email-template-type.enum';

export abstract class EmailTemplate {
  constructor(
    public readonly templateType: EmailTemplateType,
    public readonly templateContent: Record<string, string | null>,
  ) {}
}

export interface EmailConfirmationTemplateContent {
  confirmationUrl: string;
  userEmail: string;
  currentYear: string;
  companyName: string;
}

export interface InvitationTemplateContent {
  invitationUrl: string;
  userEmail: string;
  invitingCompanyName: string;
  productName: string;
  currentYear: string;
  adminName: string | null;
}

export interface PasswordResetTemplateContent {
  resetUrl: string;
  forgotPasswordUrl: string;
  userEmail: string;
  companyName: string;
  productName: string;
  currentYear: string;
  userName?: string;
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

export class InvitationTemplate extends EmailTemplate {
  constructor(public readonly content: InvitationTemplateContent) {
    super(EmailTemplateType.INVITATION, {
      invitationUrl: content.invitationUrl,
      userEmail: content.userEmail,
      invitingCompanyName: content.invitingCompanyName,
      productName: content.productName,
      currentYear: content.currentYear,
      adminName: content.adminName,
    });
  }
}

export class PasswordResetTemplate extends EmailTemplate {
  constructor(public readonly content: PasswordResetTemplateContent) {
    super(EmailTemplateType.PASSWORD_RESET, {
      resetUrl: content.resetUrl,
      forgotPasswordUrl: content.forgotPasswordUrl,
      userEmail: content.userEmail,
      companyName: content.companyName,
      productName: content.productName,
      currentYear: content.currentYear,
      userName: content.userName || '',
    });
  }
}
