import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';

/** Whether the user owns a personal skill; shared, workspace, team and org skills do not count. */
@Injectable()
export class HasPersonalSkillUseCase {
  private readonly logger = new Logger(HasPersonalSkillUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(): Promise<boolean> {
    const { userId } = getRequiredUserContext(this.context);
    this.logger.log({ userId }, 'execute');
    return this.repository.existsPersonalByOwner(userId);
  }
}
