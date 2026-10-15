import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { CreateHandoverRequestCommand } from 'src/domain/handovers/application/use-cases/create-handover-request/create-handover-request.command';
import { CreateHandoverRequestUseCase } from 'src/domain/handovers/application/use-cases/create-handover-request/create-handover-request.use-case';
import { DecideHandoverRequestCommand } from 'src/domain/handovers/application/use-cases/decide-handover-request/decide-handover-request.command';
import { DecideHandoverRequestUseCase } from 'src/domain/handovers/application/use-cases/decide-handover-request/decide-handover-request.use-case';
import { FindPendingHandoverQuery } from 'src/domain/handovers/application/use-cases/find-pending-handover/find-pending-handover.query';
import { FindPendingHandoverUseCase } from 'src/domain/handovers/application/use-cases/find-pending-handover/find-pending-handover.use-case';
import { GetHandoverSummaryUseCase } from 'src/domain/handovers/application/use-cases/get-handover-summary/get-handover-summary.use-case';
import { ListHandoverTargetsQuery } from 'src/domain/handovers/application/use-cases/list-handover-targets/list-handover-targets.query';
import { ListHandoverTargetsUseCase } from 'src/domain/handovers/application/use-cases/list-handover-targets/list-handover-targets.use-case';
import { ListReviewableHandoversQuery } from 'src/domain/handovers/application/use-cases/list-reviewable-handovers/list-reviewable-handovers.query';
import { ListReviewableHandoversUseCase } from 'src/domain/handovers/application/use-cases/list-reviewable-handovers/list-reviewable-handovers.use-case';
import {
  CreateHandoverRequestDto,
  HandoverResourceTypeQueryDto,
  PendingHandoverQueryDto,
} from './dto/handover-queries.dto';
import {
  HandoverRequestDto,
  HandoverSummaryDto,
  HandoverTargetsResponseDto,
  HandoverTargetTypeDto,
  PendingHandoverResponseDto,
} from './dto/handover-request.dto';
import { HandoverRequestDtoMapper } from './mappers/handover-request-dto.mapper';

@ApiTags('handover-requests')
@Controller('handover-requests')
export class HandoverRequestsController {
  private readonly logger = new Logger(HandoverRequestsController.name);

  constructor(
    private readonly listTargets: ListHandoverTargetsUseCase,
    private readonly createRequest: CreateHandoverRequestUseCase,
    private readonly decideRequest: DecideHandoverRequestUseCase,
    private readonly listReviewable: ListReviewableHandoversUseCase,
    private readonly getSummary: GetHandoverSummaryUseCase,
    private readonly findPending: FindPendingHandoverUseCase,
    private readonly mapper: HandoverRequestDtoMapper,
  ) {}

  @Get('targets')
  @ApiOperation({
    summary: 'Targets the caller may hand an own item over to',
  })
  @ApiResponse({ status: 200, type: HandoverTargetsResponseDto })
  async targets(
    @Query() query: HandoverResourceTypeQueryDto,
  ): Promise<HandoverTargetsResponseDto> {
    return this.mapper.toTargetsDto(
      await this.listTargets.execute(
        new ListHandoverTargetsQuery(query.resourceType),
      ),
    );
  }

  @Get('summary')
  @ApiOperation({ summary: 'Review rights and open request counts' })
  @ApiResponse({ status: 200, type: HandoverSummaryDto })
  summary(): Promise<HandoverSummaryDto> {
    return this.getSummary.execute();
  }

  @Get('pending')
  @ApiOperation({
    summary: 'The open request for an item, for its requester or reviewers',
  })
  @ApiResponse({ status: 200, type: PendingHandoverResponseDto })
  async pending(
    @Query() query: PendingHandoverQueryDto,
  ): Promise<PendingHandoverResponseDto> {
    const pending = await this.findPending.execute(
      new FindPendingHandoverQuery(query.resourceType, query.resourceId),
    );
    return { pending: pending ? this.mapper.toPendingDto(pending) : null };
  }

  @Get()
  @ApiOperation({ summary: 'Open requests the caller may review' })
  @ApiResponse({ status: 200, type: [HandoverRequestDto] })
  async list(
    @Query() query: HandoverResourceTypeQueryDto,
  ): Promise<HandoverRequestDto[]> {
    const views = await this.listReviewable.execute(
      new ListReviewableHandoversQuery(query.resourceType),
    );
    return views.map((view) => this.mapper.toDto(view));
  }

  @Post()
  @ApiOperation({
    summary: 'Hand over an own item, or request it',
    description:
      'Applies immediately when the caller may review the target; otherwise a pending request is created.',
  })
  @ApiResponse({ status: 201, type: HandoverRequestDto })
  async create(
    @Body() dto: CreateHandoverRequestDto,
  ): Promise<HandoverRequestDto> {
    this.logger.log(
      { resourceType: dto.resourceType, targetType: dto.targetType },
      'create',
    );
    const view = await this.createRequest.execute(
      new CreateHandoverRequestCommand(
        dto.resourceType,
        dto.resourceId,
        dto.targetType === HandoverTargetTypeDto.TEAM
          ? { type: 'team', teamId: dto.targetTeamId! }
          : { type: 'org' },
      ),
    );
    return this.mapper.toDto(view);
  }

  @Post(':id/approve')
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: HandoverRequestDto })
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<HandoverRequestDto> {
    return this.decide(id, 'approve');
  }

  @Post(':id/reject')
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: HandoverRequestDto })
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<HandoverRequestDto> {
    return this.decide(id, 'reject');
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async withdraw(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    await this.decideRequest.execute(
      new DecideHandoverRequestCommand(id, 'withdraw'),
    );
  }

  private async decide(
    id: UUID,
    decision: 'approve' | 'reject',
  ): Promise<HandoverRequestDto> {
    const view = await this.decideRequest.execute(
      new DecideHandoverRequestCommand(id, decision),
    );
    return this.mapper.toDto(view);
  }
}
