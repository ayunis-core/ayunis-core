import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillActivationService } from 'src/domain/skills/application/services/skill-activation.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';

@Injectable()
export class ActivateWorkspaceSkillByNameUseCase {
  private readonly logger = new Logger(
    ActivateWorkspaceSkillByNameUseCase.name,
  );

  constructor(
    private readonly findThread: FindThreadUseCase,
    private readonly repository: SkillRepository,
    private readonly activation: SkillActivationService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(query: { threadId: UUID; name: string }) {
    this.logger.log(query, 'Activating workspace skill');
    const { thread } = await this.findThread.execute(
      new FindThreadQuery(query.threadId),
    );
    if (!thread.workspaceId) throw new SkillNotFoundError(query.name);
    const skill = await this.repository.findByNameAndWorkspace(
      query.name,
      thread.workspaceId,
    );
    if (!skill) throw new SkillNotFoundError(query.name);
    return this.activation.activateOnThread(skill.id, thread);
  }
}
