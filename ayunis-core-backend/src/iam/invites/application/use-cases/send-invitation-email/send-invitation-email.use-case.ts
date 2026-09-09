import { Injectable, Logger } from '@nestjs/common';
import { SendInvitationEmailCommand } from './send-invitation-email.command';
import type { RenderedEmailContent } from 'src/common/email-templates/domain/rendered-email-content.entity';
import type { EmailDeliveryReceipt } from 'src/common/emails/application/models/email-delivery-receipt';
import { SendEmailCommand } from 'src/common/emails/application/use-cases/send-email/send-email.command';
import { SendEmailUseCase } from 'src/common/emails/application/use-cases/send-email/send-email.use-case';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from 'src/common/errors/base.error';
import { InvitationTemplate } from 'src/common/email-templates/domain/email-template.entity';
import { RenderTemplateUseCase } from 'src/common/email-templates/application/use-cases/render-template/render-template.use-case';
import { RenderTemplateCommand } from 'src/common/email-templates/application/use-cases/render-template/render-template.command';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { FindOrgByIdQuery } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.query';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { InviteEmailSendingFailedError } from 'src/iam/invites/application/invites.errors';
import type { Invite } from 'src/iam/invites/domain/invite.entity';

@Injectable()
export class SendInvitationEmailUseCase {
  private readonly logger = new Logger(SendInvitationEmailUseCase.name);

  constructor(
    private readonly sendEmailUseCase: SendEmailUseCase,
    private readonly configService: ConfigService,
    private readonly renderTemplateUseCase: RenderTemplateUseCase,
    private readonly findOrgByIdUseCase: FindOrgByIdUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
  ) {}

  async execute(command: SendInvitationEmailCommand): Promise<void> {
    this.logPreparation(command.invite);
    try {
      const org = await this.findOrgByIdUseCase.execute(
        new FindOrgByIdQuery(command.invite.orgId),
      );
      const invitingUserName = await this.findInvitingUserName(command.invite);
      const content = this.renderInvitation(
        command,
        org.name,
        invitingUserName,
      );
      const receipt = await this.sendEmailUseCase.execute(
        new SendEmailCommand({
          to: command.invite.email,
          subject: `Einladung zu ${org.name} – Ayunis Core`,
          html: content.html,
          text: content.text,
        }),
      );
      this.logDeliveryReceipt(command.invite, receipt);
    } catch (error) {
      this.handleFailure(command.invite, error);
    }
  }

  private async findInvitingUserName(invite: Invite): Promise<string | null> {
    if (!invite.inviterId) return null;
    const user = await this.findUserByIdUseCase.execute(
      new FindUserByIdQuery(invite.inviterId),
    );
    return user.name;
  }

  private renderInvitation(
    command: SendInvitationEmailCommand,
    orgName: string,
    invitingUserName: string | null,
  ): RenderedEmailContent {
    const baseUrl = this.configService.get<string>('app.frontend.baseUrl');
    const path = this.configService.get<string>('app.frontend.emailAssetsPath');
    const assetBase = `${baseUrl}${path}`;
    const template = new InvitationTemplate({
      invitationUrl: command.url,
      userEmail: command.invite.email,
      invitingCompanyName: orgName,
      productName: 'Ayunis Core',
      currentYear: new Date().getFullYear().toString(),
      adminName: invitingUserName,
      logoUrl: `${assetBase}/logo.png`,
      teamUrl: `${assetBase}/team.png`,
      bannerUrl: `${assetBase}/banner-welcome.png`,
    });
    return this.renderTemplateUseCase.execute(
      new RenderTemplateCommand(template),
    );
  }

  private logPreparation(invite: Invite): void {
    this.logger.log(
      {
        inviteId: invite.id,
        email: invite.email,
        orgId: invite.orgId,
        inviterId: invite.inviterId,
        role: invite.role,
      },
      'Preparing invitation email',
    );
  }

  private logDeliveryReceipt(
    invite: Invite,
    receipt: EmailDeliveryReceipt,
  ): void {
    this.logger.log(
      {
        inviteId: invite.id,
        email: invite.email,
        orgId: invite.orgId,
        smtpMessageId: receipt.messageId,
        smtpStatusCode: receipt.statusCode,
        acceptedRecipientCount: receipt.acceptedRecipients.length,
        rejectedRecipientCount: receipt.rejectedRecipients.length,
        pendingRecipientCount: receipt.pendingRecipients.length,
      },
      'Invitation email handed to SMTP transport',
    );
  }

  private handleFailure(invite: Invite, error: unknown): never {
    if (error instanceof ApplicationError) throw error;
    this.logger.error(
      { err: error as Error, inviteId: invite.id, email: invite.email },
      'Error sending invitation email',
    );
    throw new InviteEmailSendingFailedError(
      error instanceof Error ? error.message : 'Unknown error',
      { inviteId: invite.id, email: invite.email },
    );
  }
}
