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
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { RequireAcademyCertificate } from 'src/iam/academy-access/application/decorators/academy-certificate.decorator';
import { RequireSubscription } from 'src/iam/authorization/application/decorators/subscription.decorator';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
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
import { CreateRoutineDto } from './dto/create-routine.dto';
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
  async create(@Body() dto: CreateRoutineDto): Promise<RoutineResponseDto> {
    this.logger.log('create');
    const routine = await this.createRoutineUseCase.execute(
      new CreateRoutineCommand(dto),
    );
    return this.routineDtoMapper.toDto(routine);
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
