import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import { UnexpectedRoutineError } from 'src/domain/routines/application/routines.errors';
import type { Routine } from 'src/domain/routines/domain/routine.entity';

@Injectable()
export class FindAllRoutinesUseCase {
  private readonly logger = new Logger(FindAllRoutinesUseCase.name);

  constructor(
    private readonly routinesRepository: RoutinesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  async execute(): Promise<Routine[]> {
    this.logger.log('Listing routines');
    const { userId } = getRequiredUserContext(this.contextService);
    return this.routinesRepository.findAllByUserId(userId);
  }
}
