import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import {
  RoutineNotFoundError,
  UnexpectedRoutineError,
} from 'src/domain/routines/application/routines.errors';
import type { Routine } from 'src/domain/routines/domain/routine.entity';
import { FindRoutineQuery } from './find-routine.query';

@Injectable()
export class FindRoutineUseCase {
  private readonly logger = new Logger(FindRoutineUseCase.name);

  constructor(
    private readonly routinesRepository: RoutinesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  async execute(query: FindRoutineQuery): Promise<Routine> {
    this.logger.log({ routineId: query.id }, 'Finding routine');
    const { userId } = getRequiredUserContext(this.contextService);
    const routine = await this.routinesRepository.findById(userId, query.id);
    if (!routine) throw new RoutineNotFoundError(query.id);
    return routine;
  }
}
