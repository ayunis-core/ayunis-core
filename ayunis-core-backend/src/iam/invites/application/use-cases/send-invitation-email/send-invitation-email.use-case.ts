import { Injectable, Logger } from '@nestjs/common';
import { SendInvitationEmailCommand } from './send-invitation-email.command';
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
import { InviteEmailSendingFailedError } from '../../invites.errors';

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
    try {
      this.logger.log('execute', {
        inviteId: command.invite.id,
        email: command.invite.email,
        orgId: command.invite.orgId,
      });

      // Get organization information
      this.logger.debug('Fetching organization information', {
        orgId: command.invite.orgId,
      });
      const org = await this.findOrgByIdUseCase.execute(
        new FindOrgByIdQuery(command.invite.orgId),
      );

      // Get inviting user information
      this.logger.debug('Fetching inviting user information', {
        inviterId: command.invite.inviterId,
      });
      const invitingUser = await this.findUserByIdUseCase.execute(
        new FindUserByIdQuery(command.invite.inviterId),
      );

      // Create invitation email template
      this.logger.debug('Creating invitation email template', {
        inviteId: command.invite.id,
        orgName: org.name,
      });
      const template = new InvitationTemplate({
        invitationUrl: command.url,
        userEmail: command.invite.email,
        invitingCompanyName: org.name,
        productName: 'Ayunis Core',
        currentYear: new Date().getFullYear().toString(),
        adminName: invitingUser.name,
      });

      // Render email content
      const emailContent = this.renderTemplateUseCase.execute(
        new RenderTemplateCommand(template),
      );

      // Send the invitation email
      this.logger.debug('Sending invitation email', {
        inviteId: command.invite.id,
        email: command.invite.email,
      });
      await this.sendEmailUseCase.execute(
        new SendEmailCommand({
          to: command.invite.email,
          subject: `Einladung zu ${org.name}`,
          html: emailContent.html,
          text: emailContent.text,
        }),
      );

      this.logger.debug('Invitation email sent successfully', {
        inviteId: command.invite.id,
        email: command.invite.email,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error sending invitation email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        inviteId: command.invite.id,
        email: command.invite.email,
      });
      throw new InviteEmailSendingFailedError(
        error instanceof Error ? error.message : 'Unknown error',
        {
          inviteId: command.invite.id,
          email: command.invite.email,
        },
      );
    }
  }
}
