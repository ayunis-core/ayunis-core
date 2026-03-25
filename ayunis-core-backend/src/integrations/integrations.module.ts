import { Module } from '@nestjs/common';
import { MetricsModule } from './metrics/metrics.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [MetricsModule, WebhooksModule],
  exports: [WebhooksModule],
})
export class IntegrationsModule {}
