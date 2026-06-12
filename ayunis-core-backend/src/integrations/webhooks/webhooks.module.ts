import { Logger, Module, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendWebhookUseCase } from './application/use-cases/send-webhook/send-webhook.use-case';
import { WebhookHandler } from './application/ports/webhook.handler';
import { HttpWebhookHandler } from './infrastructure/http/http-webhook.handler';
import { WebhookDispatchListener } from './listeners/webhook-dispatch.listener';

@Module({
  providers: [
    {
      provide: WebhookHandler,
      useClass: HttpWebhookHandler,
    },
    SendWebhookUseCase,
    WebhookDispatchListener,
  ],
})
export class WebhooksModule implements OnModuleInit {
  private readonly logger = new Logger(WebhooksModule.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Fail loud at boot if webhook delivery is configured without a signing
   * secret in production. Outside production we only warn so dev / test
   * setups remain ergonomic.
   */
  onModuleInit(): void {
    const url = this.configService.get<string>('app.orgEventsWebhookUrl');
    if (!url) {
      // No webhook configured at all — nothing to validate.
      return;
    }

    const secret = this.configService.get<string>('app.webhookSigningSecret');
    if (secret) {
      return;
    }

    const isProduction = this.configService.get<boolean>('app.isProduction');
    const baseMessage =
      'ORG_EVENTS_WEBHOOK_URL is set but WEBHOOK_SIGNING_SECRET is missing.';

    if (isProduction) {
      throw new Error(
        `${baseMessage} Refusing to start in production with unsigned outbound webhooks.`,
      );
    }

    this.logger.warn(
      `${baseMessage} Outbound webhooks will be sent UNSIGNED. This is allowed outside production but must not happen in production.`,
    );
  }
}
