import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import { UnexpectedRoutineError } from 'src/domain/routines/application/routines.errors';
import { RoutineModelService } from 'src/domain/routines/application/services/routine-model.service';
import { RoutineIntegrationService } from 'src/domain/routines/application/services/routine-integration.service';
import { Routine } from 'src/domain/routines/domain/routine.entity';
import { nextRoutineRunAt } from 'src/domain/routines/domain/routine-schedule';
import { CreateRoutineCommand } from './create-routine.command';

@Injectable()
export class CreateRoutineUseCase {
  private readonly logger = new Logger(CreateRoutineUseCase.name);

  constructor(
    private readonly routinesRepository: RoutinesRepository,
    private readonly routineModelService: RoutineModelService,
    private readonly routineIntegrationService: RoutineIntegrationService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  async execute(command: CreateRoutineCommand): Promise<Routine> {
    this.logger.log('Creating routine');
    const { userId, orgId } = getRequiredUserContext(this.contextService);
    const modelId = await this.routineModelService.select(
      command.modelId ?? null,
    );
    const mcpIntegrationIds = await this.routineIntegrationService.select(
      command.mcpIntegrationIds,
    );
    const id = randomUUID();
    return this.routinesRepository.create(
      new Routine({
        id,
        userId,
        orgId,
        name: command.name,
        prompt: command.prompt,
        modelId,
        dailyTime: command.dailyTime,
        internetEnabled: command.internetEnabled,
        mcpIntegrationIds,
        enabled: command.enabled,
        nextRunAt: command.enabled
          ? nextRoutineRunAt({ id, dailyTime: command.dailyTime }, new Date())
          : null,
      }),
    );
  }
}
