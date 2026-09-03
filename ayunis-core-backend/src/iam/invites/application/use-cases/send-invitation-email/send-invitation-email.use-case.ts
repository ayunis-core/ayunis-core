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
import { InviteEmailSendingFailedError } from 'src/iam/invites/application/invites.errors';

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

  // eslint-disable-next-line max-lines-per-function -- existing flow is unchanged except for logging migration
  async execute(command: SendInvitationEmailCommand): Promise<void> {
    try {
      this.logger.log(
        {
          inviteId: command.invite.id,
          email: command.invite.email,
          orgId: command.invite.orgId,
        },
        'execute',
      );

      // Get organization information
      this.logger.debug(
        {
          orgId: command.invite.orgId,
        },
        'Fetching organization information',
      );
      const org = await this.findOrgByIdUseCase.execute(
        new FindOrgByIdQuery(command.invite.orgId),
      );

      // Get inviting user information
      this.logger.debug(
        {
          inviterId: command.invite.inviterId,
        },
        'Fetching inviting user information',
      );
      let invitingUserName: string | null = null;
      if (command.invite.inviterId) {
        const invitingUser = await this.findUserByIdUseCase.execute(
          new FindUserByIdQuery(command.invite.inviterId),
        );
        invitingUserName = invitingUser.name;
      }

      // Build asset URLs (logo, banner, team photo) from frontend base URL.
      const frontendBaseUrl = this.configService.get<string>(
        'app.frontend.baseUrl',
      );
      const emailAssetsPath = this.configService.get<string>(
        'app.frontend.emailAssetsPath',
      );
      const assetBase = `${frontendBaseUrl}${emailAssetsPath}`;

      // Create invitation email template
      this.logger.debug(
        {
          inviteId: command.invite.id,
          name: org.name,
        },
        'Creating invitation email template',
      );
      const template = new InvitationTemplate({
        invitationUrl: command.url,
        userEmail: command.invite.email,
        invitingCompanyName: org.name,
        productName: 'Ayunis Core',
        currentYear: new Date().getFullYear().toString(),
        adminName: invitingUserName,
        logoUrl: `${assetBase}/logo.png`,
        teamUrl: `${assetBase}/team.png`,
        bannerUrl: `${assetBase}/banner-welcome.png`,
      });

      // Render email content
      const emailContent = this.renderTemplateUseCase.execute(
        new RenderTemplateCommand(template),
      );

      // Send the invitation email
      this.logger.debug(
        {
          inviteId: command.invite.id,
          email: command.invite.email,
        },
        'Sending invitation email',
      );
      await this.sendEmailUseCase.execute(
        new SendEmailCommand({
          to: command.invite.email,
          subject: `Einladung zu ${org.name} – Ayunis Core`,
          html: emailContent.html,
          text: emailContent.text,
        }),
      );

      this.logger.debug(
        {
          inviteId: command.invite.id,
          email: command.invite.email,
        },
        'Invitation email sent successfully',
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          inviteId: command.invite.id,
          email: command.invite.email,
        },
        'Error sending invitation email',
      );
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
