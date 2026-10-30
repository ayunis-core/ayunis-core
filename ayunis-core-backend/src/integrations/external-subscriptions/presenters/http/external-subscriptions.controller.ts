import { ListExternalSubscriptionLinksUseCase } from 'src/integrations/external-subscriptions/application/use-cases/list-external-subscription-links/list-external-subscription-links.use-case';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeController,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { Public } from 'src/common/guards/public.guard';
import { CoreConnectAuthGuard } from 'src/integrations/core-connect/core-connect-auth.guard';
import { ApplyExternalSubscriptionUseCase } from 'src/integrations/external-subscriptions/application/use-cases/apply-external-subscription/apply-external-subscription.use-case';
import { PrepareExternalSubscriptionUseCase } from 'src/integrations/external-subscriptions/application/use-cases/prepare-external-subscription/prepare-external-subscription.use-case';
import { ExternalSubscriptionCoordinationUseCase } from 'src/integrations/external-subscriptions/application/use-cases/external-subscription-coordination/external-subscription-coordination.use-case';
import {
  ApplyExternalSubscriptionDto,
  PrepareExternalSubscriptionDto,
  ExternalSubscriptionResultDto,
  ExternalSubscriptionPreparationDto,
  ExternalSubscriptionLinkDto,
  ExternalSubscriptionLeaseDto,
  ExternalSubscriptionLeaseResultDto,
  ExternalSubscriptionLinksQueryDto,
} from './dto/external-subscription.dto';
import { toExternalSubscriptionCommand } from './mappers/external-subscription-command.mapper';

@ApiExcludeController()
@ApiBearerAuth('core-connect')
@Public()
@UseGuards(CoreConnectAuthGuard)
@Controller('internal/core-connect/subscription-sync')
export class ExternalSubscriptionsController {
  constructor(
    private readonly apply: ApplyExternalSubscriptionUseCase,
    private readonly prepare: PrepareExternalSubscriptionUseCase,
    private readonly coordination: ExternalSubscriptionCoordinationUseCase,
    private readonly links: ListExternalSubscriptionLinksUseCase,
  ) {}

  @Post('organizations/:orgId/preparations')
  @HttpCode(200)
  @ApiOperation({ operationId: 'prepareExternalSubscription' })
  @ApiResponse({ status: 200, type: ExternalSubscriptionPreparationDto })
  prepareState(
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
    @Body() body: PrepareExternalSubscriptionDto,
  ): Promise<ExternalSubscriptionPreparationDto> {
    return this.prepare.execute({ orgId, mode: body.mode });
  }

  @Post('organizations/:orgId/state')
  @HttpCode(200)
  @ApiOperation({ operationId: 'applyExternalSubscription' })
  @ApiResponse({ status: 200, type: ExternalSubscriptionResultDto })
  @ApiResponse({
    status: 409,
    description: 'Prepared state was superseded; read provider state again',
  })
  applyState(
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
    @Body() body: ApplyExternalSubscriptionDto,
    @Headers('x-webhook-id') deliveryId?: string,
  ): Promise<ExternalSubscriptionResultDto> {
    const command = toExternalSubscriptionCommand(orgId, body);
    if (
      typeof deliveryId === 'string' &&
      /^[\x21-\x7e]{1,200}$/.test(deliveryId)
    )
      command.deliveryId = deliveryId;
    return this.apply.execute(command);
  }

  @Get('links')
  @ApiOperation({ operationId: 'listExternalSubscriptionLinks' })
  @ApiResponse({ status: 200, type: [ExternalSubscriptionLinkDto] })
  listLinks(
    @Query() query: ExternalSubscriptionLinksQueryDto,
  ): Promise<ExternalSubscriptionLinkDto[]> {
    return this.links.execute(query);
  }

  @Post('lease')
  @HttpCode(200)
  @ApiOperation({ operationId: 'coordinateExternalSubscriptions' })
  @ApiResponse({ status: 200, type: ExternalSubscriptionLeaseResultDto })
  lease(
    @Body() body: ExternalSubscriptionLeaseDto,
  ): Promise<ExternalSubscriptionLeaseResultDto> {
    return this.coordination.execute(body);
  }
}
