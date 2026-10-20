import {
  Controller,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from 'src/common/guards/public.guard';
import { CoreConnectAuthGuard } from 'src/integrations/core-connect/application/guards/core-connect-auth.guard';
import { ReconcileFynnSubscriptionsUseCase } from 'src/integrations/fynn/application/use-cases/reconcile-fynn-subscriptions/reconcile-fynn-subscriptions.use-case';
import {
  FynnApiError,
  FynnConfigurationError,
} from 'src/integrations/fynn/application/fynn.errors';
import { ConfigService } from '@nestjs/config';

@ApiExcludeController()
@Public()
@UseGuards(CoreConnectAuthGuard)
@Controller('internal/core-connect/fynn/customers')
export class FynnCustomerSyncController {
  constructor(
    private readonly reconcile: ReconcileFynnSubscriptionsUseCase,
    private readonly config: ConfigService,
  ) {}
  @Post(':customerId/sync')
  @HttpCode(200)
  async synchronize(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Headers('x-webhook-id') deliveryId?: string,
  ) {
    if (
      !this.config.get<boolean>('app.isCloudHosted') ||
      !this.config.get<boolean>('features.fynnManagedSubscriptionsEnabled')
    )
      throw new FynnConfigurationError();
    const result = await this.reconcile.execute({
      customerId,
      deliveryId: deliveryId?.slice(0, 200),
    });
    if (result.failed > 0) throw new FynnApiError();
    return result;
  }
}
