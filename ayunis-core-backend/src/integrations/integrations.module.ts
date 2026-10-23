import { Module } from '@nestjs/common';
import { MetricsModule } from './metrics/metrics.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CoreConnectModule } from './core-connect/core-connect.module';

@Module({
  imports: [MetricsModule, WebhooksModule, CoreConnectModule],
})
export class IntegrationsModule {}
