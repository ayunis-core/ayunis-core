import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from 'src/common/errors/base.error';
import { FirstStepsTemplate } from 'src/common/email-templates/domain/email-template.entity';
import { RenderTemplateUseCase } from 'src/common/email-templates/application/use-cases/render-template/render-template.use-case';
import { RenderTemplateCommand } from 'src/common/email-templates/application/use-cases/render-template/render-template.command';
import { SendEmailCommand } from 'src/common/emails/application/use-cases/send-email/send-email.command';
import { SendEmailUseCase } from 'src/common/emails/application/use-cases/send-email/send-email.use-case';
import { SendFirstStepsEmailCommand } from './send-first-steps-email.command';
import { UsersRepository } from '../../ports/users.repository';
import { UserNotFoundError } from '../../users.errors';

/**
 * Sends the post-onboarding "Erste Schritte" email — an orientation email
 * shown after the user has finished (or skipped) the personalisation wizard
 * for the first time.
 *
 * Idempotent: only sends if `user.hasReceivedFirstStepsEmail === false`,
 * then flips the flag so subsequent calls are no-ops. Failures during
 * sending intentionally do NOT flip the flag, so a transient SMTP error
 * gives the next personalisation completion another chance to deliver.
 */
@Injectable()
export class SendFirstStepsEmailUseCase {
  private readonly logger = new Logger(SendFirstStepsEmailUseCase.name);

  constructor(
    private readonly sendEmailUseCase: SendEmailUseCase,
    private readonly configService: ConfigService,
    private readonly renderTemplateUseCase: RenderTemplateUseCase,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(command: SendFirstStepsEmailCommand): Promise<void> {
    try {
      const user = await this.usersRepository.findOneById(command.userId);
      if (!user) {
        throw new UserNotFoundError(command.userId);
      }

      if (user.hasReceivedFirstStepsEmail) {
        this.logger.debug('Skipping first-steps email — already sent', {
          userId: user.id,
        });
        return;
      }

      this.logger.log('execute', {
        userId: user.id,
        email: user.email,
      });

      const frontendBaseUrl = this.configService.get<string>(
        'app.frontend.baseUrl',
      );
      const chatEndpoint = this.configService.get<string>(
        'app.frontend.chatEndpoint',
      );
      const marketplaceEndpoint = this.configService.get<string>(
        'app.frontend.marketplaceEndpoint',
      );
      const knowledgeEndpoint = this.configService.get<string>(
        'app.frontend.knowledgeEndpoint',
      );
      const emailAssetsPath = this.configService.get<string>(
        'app.frontend.emailAssetsPath',
      );
      const assetBase = `${frontendBaseUrl}${emailAssetsPath}`;

      const firstName = user.name.split(' ')[0] || user.name;

      const template = new FirstStepsTemplate({
        userEmail: user.email,
        firstName,
        chatUrl: `${frontendBaseUrl}${chatEndpoint}`,
        marketplaceUrl: `${frontendBaseUrl}${marketplaceEndpoint}`,
        knowledgeUrl: `${frontendBaseUrl}${knowledgeEndpoint}`,
        currentYear: new Date().getFullYear().toString(),
        logoUrl: `${assetBase}/logo.png`,
        teamUrl: `${assetBase}/team.png`,
        heroBannerUrl: `${assetBase}/banner-hero-people.png`,
        skillsBannerUrl: `${assetBase}/banner-skills.png`,
        knowledgeBannerUrl: `${assetBase}/banner-knowledge.png`,
        iconPencilUrl: `${assetBase}/icon-pencil.png`,
        iconFileTextUrl: `${assetBase}/icon-file-text.png`,
        iconMessageCircleUrl: `${assetBase}/icon-message-circle.png`,
      });

      const emailContent = this.renderTemplateUseCase.execute(
        new RenderTemplateCommand(template),
      );

      await this.sendEmailUseCase.execute(
        new SendEmailCommand({
          to: user.email,
          subject: 'Was Sie mit Ayunis Core machen können',
          html: emailContent.html,
          text: emailContent.text,
        }),
      );

      user.hasReceivedFirstStepsEmail = true;
      await this.usersRepository.update(user);

      this.logger.debug('First-steps email sent and flag persisted', {
        userId: user.id,
      });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error sending first-steps email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: command.userId,
      });
      // Intentionally swallow non-application errors here so the trigger
      // (e.g. personalisation completion) is not blocked by SMTP issues.
    }
  }
}
