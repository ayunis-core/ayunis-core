import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import {
  RoutinesRepository,
  type RoutineDefinitionChanges,
} from 'src/domain/routines/application/ports/routines.repository';
import {
  RoutineInvalidAllowedDomainsError,
  RoutineInvalidScheduleError,
  RoutineNotFoundError,
  UnexpectedRoutineError,
} from 'src/domain/routines/application/routines.errors';
import { RoutineModelService } from 'src/domain/routines/application/services/routine-model.service';
import type { Routine } from 'src/domain/routines/domain/routine.entity';
import { routineInternetSettings } from 'src/domain/routines/domain/routine-internet-access';
import { scheduleChangesForEdit } from 'src/domain/routines/domain/routine-schedule';
import {
  routineSchedule,
  type RoutineSchedule,
  type RoutineScheduleInput,
} from 'src/domain/routines/domain/routine-frequency';
import { UpdateRoutineCommand } from './update-routine.command';

/**
 * The routine is read with a row lock: whether an edit re-enables it or
 * changes its schedule decides the schedule written with it, and a run finishing
 * meanwhile (which may pause it) must not slip in between.
 */
@Injectable()
export class UpdateRoutineUseCase {
  private readonly logger = new Logger(UpdateRoutineUseCase.name);

  constructor(
    private readonly routinesRepository: RoutinesRepository,
    private readonly routineModelService: RoutineModelService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  @Transactional()
  async execute(command: UpdateRoutineCommand): Promise<Routine> {
    this.logger.log({ routineId: command.id }, 'Updating routine');
    const { userId } = getRequiredUserContext(this.contextService);
    const { id, modelId, internetAccess, allowedDomains, ...rest } = command;
    const changes = { ...rest, schedule: parseSchedule(command.schedule) };
    const current = await this.routinesRepository.findByIdForUpdate(userId, id);
    if (!current) throw new RoutineNotFoundError(id);
    const updated = await this.routinesRepository.updateDefinition(userId, id, {
      ...changes,
      ...(modelId !== undefined && {
        modelId: await this.routineModelService.select(modelId),
      }),
      ...internetChanges(current, { internetAccess, allowedDomains }),
      ...scheduleChangesForEdit(current, changes, new Date()),
    });
    if (!updated) throw new RoutineNotFoundError(id);
    return updated;
  }
}

function parseSchedule(
  input: RoutineScheduleInput | undefined,
): RoutineSchedule | undefined {
  if (input === undefined) return undefined;
  const result = routineSchedule(input);
  if (!result.ok) throw new RoutineInvalidScheduleError(result.problem);
  return result.schedule;
}

/**
 * The mode and the list are checked together, as they will be stored: an
 * omitted one keeps its stored value, so switching to `allowlist` works with
 * the domains the routine already has.
 */
function internetChanges(
  current: Routine,
  changes: Pick<UpdateRoutineCommand, 'internetAccess' | 'allowedDomains'>,
): Pick<RoutineDefinitionChanges, 'internetAccess' | 'allowedDomains'> {
  const { internetAccess, allowedDomains } = changes;
  if (internetAccess === undefined && allowedDomains === undefined) return {};
  const internet = routineInternetSettings(
    internetAccess ?? current.internetAccess,
    allowedDomains ?? current.allowedDomains,
  );
  if (!internet.ok)
    throw new RoutineInvalidAllowedDomainsError(internet.problem);
  return {
    ...(internetAccess !== undefined && { internetAccess }),
    ...(allowedDomains !== undefined && {
      allowedDomains: internet.settings.allowedDomains,
    }),
  };
}
