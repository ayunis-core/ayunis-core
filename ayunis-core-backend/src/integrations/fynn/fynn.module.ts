import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreConnectModule } from 'src/integrations/core-connect/core-connect.module';
import { SubscriptionsModule } from 'src/iam/subscriptions/subscriptions.module';
import { TrialsModule } from 'src/iam/trials/trials.module';
import { AddonsModule } from 'src/iam/addons/addons.module';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { FynnClient } from 'src/integrations/fynn/application/ports/fynn-client';
import { FynnHttpClient } from 'src/integrations/fynn/infrastructure/http/fynn-http-client';
import { LoadFynnSnapshotService } from 'src/integrations/fynn/application/services/load-fynn-snapshot.service';
import { SyncFynnSubscriptionUseCase } from 'src/integrations/fynn/application/use-cases/sync-fynn-subscription/sync-fynn-subscription.use-case';
import { FynnSyncController } from 'src/integrations/fynn/presenters/http/fynn-sync.controller';

@Module({
  imports: [
    ConfigModule,
    CoreConnectModule,
    SubscriptionsModule,
    TrialsModule,
    AddonsModule,
    OrgsModule,
  ],
  controllers: [FynnSyncController],
  providers: [
    { provide: FynnClient, useClass: FynnHttpClient },
    LoadFynnSnapshotService,
    SyncFynnSubscriptionUseCase,
  ],
  exports: [SyncFynnSubscriptionUseCase],
})
export class FynnModule {}
