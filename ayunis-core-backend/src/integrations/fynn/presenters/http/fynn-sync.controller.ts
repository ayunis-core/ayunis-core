import {
  Controller,
  HttpCode,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from 'src/common/guards/public.guard';
import { CoreConnectAuthGuard } from 'src/integrations/core-connect/application/guards/core-connect-auth.guard';
import { SyncFynnSubscriptionUseCase } from 'src/integrations/fynn/application/use-cases/sync-fynn-subscription/sync-fynn-subscription.use-case';

@ApiExcludeController()
@Public()
@UseGuards(CoreConnectAuthGuard)
@Controller('internal/core-connect/fynn/subscriptions')
export class FynnSyncController {
  constructor(private readonly sync: SyncFynnSubscriptionUseCase) {}

  @Post(':subscriptionId/sync')
  @HttpCode(200)
  async synchronize(
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
    @Headers('x-webhook-id') deliveryId?: string,
  ) {
    return this.sync.execute({
      subscriptionId,
      ...(deliveryId ? { deliveryId: deliveryId.slice(0, 200) } : {}),
    });
  }
}
