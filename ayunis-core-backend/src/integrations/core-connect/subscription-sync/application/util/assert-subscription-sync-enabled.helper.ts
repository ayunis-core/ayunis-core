import type { ConfigService } from '@nestjs/config';
import { SubscriptionSyncDisabledError } from 'src/integrations/core-connect/subscription-sync/application/subscription-sync.errors';

export function assertSubscriptionSyncEnabled(config: ConfigService): void {
  if (
    !config.get<boolean>('app.isCloudHosted') ||
    !config.get<boolean>('features.externalSubscriptionsEnabled')
  )
    throw new SubscriptionSyncDisabledError();
}
