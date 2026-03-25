import { Module } from '@nestjs/common';
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
export class WebhooksModule {}
