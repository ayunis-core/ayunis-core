import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { UserCreatedEvent } from '../events/user-created.event';
import { FirstStepsTemplate } from 'src/common/email-templates/domain/email-template.entity';
import { RenderTemplateUseCase } from 'src/common/email-templates/application/use-cases/render-template/render-template.use-case';
import { RenderTemplateCommand } from 'src/common/email-templates/application/use-cases/render-template/render-template.command';
import { SendEmailCommand } from 'src/common/emails/application/use-cases/send-email/send-email.command';
import { SendEmailUseCase } from 'src/common/emails/application/use-cases/send-email/send-email.use-case';

@Injectable()
export class FirstStepsEmailListener {
  private readonly logger = new Logger(FirstStepsEmailListener.name);

  constructor(
    private readonly sendEmailUseCase: SendEmailUseCase,
    private readonly configService: ConfigService,
    private readonly renderTemplateUseCase: RenderTemplateUseCase,
  ) {}

  private static readonly DELAY_MS = 5 * 60 * 1000;

  @OnEvent(UserCreatedEvent.EVENT_NAME)
  handleUserCreated(event: UserCreatedEvent): void {
    setTimeout(
      () => void this.sendFirstStepsEmail(event),
      FirstStepsEmailListener.DELAY_MS,
    );
  }

  private async sendFirstStepsEmail(event: UserCreatedEvent): Promise<void> {
    try {
      const { user } = event;

      this.logger.log('Sending first-steps email', {
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

      this.logger.log('First-steps email sent', { userId: user.id });
    } catch (error) {
      this.logger.error('Failed to send first-steps email', {
        userId: event.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
