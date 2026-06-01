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
  logoUrl: string;
  teamUrl: string;
  bannerUrl: string;
}

export interface PasswordResetTemplateContent {
  resetUrl: string;
  forgotPasswordUrl: string;
  userEmail: string;
  companyName: string;
  productName: string;
  currentYear: string;
  logoUrl: string;
  teamUrl: string;
  userName?: string;
}

export interface SetInitialPasswordTemplateContent {
  resetUrl: string;
  userEmail: string;
  invitingCompanyName: string;
  userName: string;
  productName: string;
  currentYear: string;
  logoUrl: string;
  teamUrl: string;
  bannerUrl: string;
}

export interface FirstStepsTemplateContent {
  userEmail: string;
  firstName: string;
  chatUrl: string;
  marketplaceUrl: string;
  knowledgeUrl: string;
  logoUrl: string;
  teamUrl: string;
  heroBannerUrl: string;
  skillsBannerUrl: string;
  knowledgeBannerUrl: string;
  iconPencilUrl: string;
  iconFileTextUrl: string;
  iconMessageCircleUrl: string;
  currentYear: string;
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

export class SetInitialPasswordTemplate extends EmailTemplate {
  constructor(public readonly content: SetInitialPasswordTemplateContent) {
    super(EmailTemplateType.SET_INITIAL_PASSWORD, {
      resetUrl: content.resetUrl,
      userEmail: content.userEmail,
      invitingCompanyName: content.invitingCompanyName,
      userName: content.userName,
      productName: content.productName,
      currentYear: content.currentYear,
    });
  }
}

export class FirstStepsTemplate extends EmailTemplate {
  constructor(public readonly content: FirstStepsTemplateContent) {
    super(EmailTemplateType.FIRST_STEPS, {
      userEmail: content.userEmail,
      firstName: content.firstName,
      chatUrl: content.chatUrl,
      marketplaceUrl: content.marketplaceUrl,
      knowledgeUrl: content.knowledgeUrl,
      currentYear: content.currentYear,
    });
  }
}
