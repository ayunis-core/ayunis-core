import { ListSubscriptionSyncLinksUseCase } from 'src/integrations/core-connect/subscription-sync/application/use-cases/list-subscription-sync-links/list-subscription-sync-links.use-case';
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
  ApiHeader,
  ApiExcludeController,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { Public } from 'src/common/guards/public.guard';
import { CoreConnectAuthGuard } from 'src/integrations/core-connect/auth/core-connect-auth.guard';
import { ApplySubscriptionSyncStateUseCase } from 'src/integrations/core-connect/subscription-sync/application/use-cases/apply-subscription-sync-state/apply-subscription-sync-state.use-case';
import { PrepareSubscriptionSyncUseCase } from 'src/integrations/core-connect/subscription-sync/application/use-cases/prepare-subscription-sync/prepare-subscription-sync.use-case';
import { SubscriptionSyncCoordinationUseCase } from 'src/integrations/core-connect/subscription-sync/application/use-cases/subscription-sync-coordination/subscription-sync-coordination.use-case';
import {
  ApplyExternalSubscriptionDto,
  PrepareExternalSubscriptionDto,
  ExternalSubscriptionResultDto,
  ExternalSubscriptionPreparationDto,
  ExternalSubscriptionLinkDto,
  ExternalSubscriptionLeaseDto,
  ExternalSubscriptionLeaseResultDto,
  ExternalSubscriptionLinksQueryDto,
} from './dto/subscription-sync.dto';
import { toSubscriptionSyncCommand } from './mappers/subscription-sync-command.mapper';

@ApiExcludeController()
@ApiBearerAuth('core-connect')
@Public()
@UseGuards(CoreConnectAuthGuard)
@Controller('internal/core-connect/subscription-sync')
export class SubscriptionSyncController {
  constructor(
    private readonly apply: ApplySubscriptionSyncStateUseCase,
    private readonly prepare: PrepareSubscriptionSyncUseCase,
    private readonly coordination: SubscriptionSyncCoordinationUseCase,
    private readonly links: ListSubscriptionSyncLinksUseCase,
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
  @ApiHeader({
    name: 'x-webhook-id',
    required: false,
    schema: { type: 'string', maxLength: 200 },
  })
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
    return this.apply.execute(
      toSubscriptionSyncCommand(orgId, body, deliveryId),
    );
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
