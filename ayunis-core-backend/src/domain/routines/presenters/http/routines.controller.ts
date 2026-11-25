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
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { RequireAcademyCertificate } from 'src/iam/academy-access/application/decorators/academy-certificate.decorator';
import { RequireSubscription } from 'src/iam/authorization/application/decorators/subscription.decorator';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { RequestWithSubscriptionContext } from 'src/iam/authorization/application/guards/subscription.guard';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { CreateRoutineUseCase } from 'src/domain/routines/application/use-cases/create-routine/create-routine.use-case';
import { CreateRoutineCommand } from 'src/domain/routines/application/use-cases/create-routine/create-routine.command';
import { FindAllRoutinesUseCase } from 'src/domain/routines/application/use-cases/find-all-routines/find-all-routines.use-case';
import { FindRoutineUseCase } from 'src/domain/routines/application/use-cases/find-routine/find-routine.use-case';
import { FindRoutineQuery } from 'src/domain/routines/application/use-cases/find-routine/find-routine.query';
import { UpdateRoutineUseCase } from 'src/domain/routines/application/use-cases/update-routine/update-routine.use-case';
import { UpdateRoutineCommand } from 'src/domain/routines/application/use-cases/update-routine/update-routine.command';
import { DeleteRoutineUseCase } from 'src/domain/routines/application/use-cases/delete-routine/delete-routine.use-case';
import { DeleteRoutineCommand } from 'src/domain/routines/application/use-cases/delete-routine/delete-routine.command';
import { RunRoutineNowUseCase } from 'src/domain/routines/application/use-cases/run-routine-now/run-routine-now.use-case';
import { RunRoutineNowCommand } from 'src/domain/routines/application/use-cases/run-routine-now/run-routine-now.command';
import { ImproveRoutinePromptUseCase } from 'src/domain/routines/application/use-cases/improve-routine-prompt/improve-routine-prompt.use-case';
import { ImproveRoutinePromptCommand } from 'src/domain/routines/application/use-cases/improve-routine-prompt/improve-routine-prompt.command';
import { CreateRoutineDto } from './dto/create-routine.dto';
import {
  ImproveRoutinePromptDto,
  ImprovedRoutinePromptResponseDto,
} from './dto/improve-routine-prompt.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { RoutineResponseDto } from './dto/routine-response.dto';
import { RoutineDtoMapper } from './mappers/routine-dto.mapper';

const ROUTINE_ID_PARAM = {
  name: 'id',
  description: 'The UUID of the routine',
  type: 'string',
  format: 'uuid',
} as const;

@ApiTags('routines')
@RequireFeature(FeatureFlag.Routines)
@RequireAcademyCertificate()
@RequirePermission(Permission.MANAGE_ROUTINES)
@ApiResponse({
  status: 403,
  description: 'The manage routines permission is required',
})
@Controller('routines')
export class RoutinesController {
  private readonly logger = new Logger(RoutinesController.name);

  constructor(
    private readonly createRoutineUseCase: CreateRoutineUseCase,
    private readonly findAllRoutinesUseCase: FindAllRoutinesUseCase,
    private readonly findRoutineUseCase: FindRoutineUseCase,
    private readonly updateRoutineUseCase: UpdateRoutineUseCase,
    private readonly deleteRoutineUseCase: DeleteRoutineUseCase,
    private readonly runRoutineNowUseCase: RunRoutineNowUseCase,
    private readonly improveRoutinePromptUseCase: ImproveRoutinePromptUseCase,
    private readonly routineDtoMapper: RoutineDtoMapper,
  ) {}

  @Get()
  @ApiOperation({ summary: "List the current user's routines" })
  @ApiResponse({ status: 200, type: [RoutineResponseDto] })
  async findAll(): Promise<RoutineResponseDto[]> {
    this.logger.log('findAll');
    const routines = await this.findAllRoutinesUseCase.execute();
    return routines.map((routine) => this.routineDtoMapper.toDto(routine));
  }

  @Post()
  @ApiOperation({ summary: 'Create a routine' })
  @ApiResponse({ status: 201, type: RoutineResponseDto })
  @ApiResponse({
    status: 409,
    description: 'A routine was already created from this chat proposal',
  })
  async create(@Body() dto: CreateRoutineDto): Promise<RoutineResponseDto> {
    this.logger.log('create');
    const routine = await this.createRoutineUseCase.execute(
      new CreateRoutineCommand(dto),
    );
    return this.routineDtoMapper.toDto(routine);
  }

  @Post('improve-prompt')
  @RequireSubscription()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rewrite a routine's task without saving it" })
  @ApiBody({ type: ImproveRoutinePromptDto })
  @ApiResponse({ status: 200, type: ImprovedRoutinePromptResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Subscription or the manage routines permission required',
  })
  @ApiResponse({
    status: 422,
    description:
      'NO_DEFAULT_MODEL_FOUND when the caller may use no model at all; ROUTINE_PROMPT_IMPROVEMENT_UNAVAILABLE when every permitted model is anonymous-only',
  })
  @ApiResponse({
    status: 502,
    description:
      'ROUTINE_PROMPT_IMPROVEMENT_FAILED when the model returned no usable text',
  })
  async improvePrompt(
    @Body() dto: ImproveRoutinePromptDto,
    @Req() request: RequestWithSubscriptionContext,
  ): Promise<ImprovedRoutinePromptResponseDto> {
    this.logger.log('improvePrompt');
    const text = await this.improveRoutinePromptUseCase.execute(
      new ImproveRoutinePromptCommand({
        name: dto.name,
        language: dto.language,
        prompt: dto.prompt,
        consumeTrialMessage: Boolean(
          request.subscriptionContext?.hasRemainingTrialMessages,
        ),
      }),
    );
    return { text };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a routine' })
  @ApiParam(ROUTINE_ID_PARAM)
  @ApiResponse({ status: 200, type: RoutineResponseDto })
  @ApiResponse({ status: 404, description: 'Routine not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<RoutineResponseDto> {
    this.logger.log({ id }, 'findOne');
    const routine = await this.findRoutineUseCase.execute(
      new FindRoutineQuery(id),
    );
    return this.routineDtoMapper.toDto(routine);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a routine' })
  @ApiParam(ROUTINE_ID_PARAM)
  @ApiResponse({ status: 200, type: RoutineResponseDto })
  @ApiResponse({ status: 404, description: 'Routine not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateRoutineDto,
  ): Promise<RoutineResponseDto> {
    this.logger.log({ id }, 'update');
    const routine = await this.updateRoutineUseCase.execute(
      new UpdateRoutineCommand({ id, ...dto }),
    );
    return this.routineDtoMapper.toDto(routine);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a routine; its threads are kept' })
  @ApiParam(ROUTINE_ID_PARAM)
  @ApiResponse({ status: 204, description: 'Routine deleted' })
  @ApiResponse({ status: 404, description: 'Routine not found' })
  async delete(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log({ id }, 'delete');
    await this.deleteRoutineUseCase.execute(new DeleteRoutineCommand(id));
  }

  @Post(':id/run')
  @RequireSubscription()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Run a routine now',
    description:
      'Queues one execution; its result appears as a new routine thread and as the routine’s last run status.',
  })
  @ApiParam(ROUTINE_ID_PARAM)
  @ApiResponse({ status: 202, description: 'Run queued' })
  @ApiResponse({
    status: 403,
    description: 'Subscription or the manage routines permission required',
  })
  @ApiResponse({ status: 404, description: 'Routine not found' })
  async runNow(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log({ id }, 'runNow');
    await this.runRoutineNowUseCase.execute(new RunRoutineNowCommand(id));
  }
}
