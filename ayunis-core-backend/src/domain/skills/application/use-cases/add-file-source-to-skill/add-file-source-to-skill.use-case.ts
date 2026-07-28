import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import { StartDocumentProcessingCommand } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.command';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { SkillRepository } from '../../ports/skill.repository';
import { SkillNotFoundError, UnexpectedSkillError } from '../../skills.errors';
import { assertSkillHasSourceCapacity } from '../../util/skill-source-capacity';
import { AddSourceToSkillUseCase } from '../add-source-to-skill/add-source-to-skill.use-case';
import { AddSourceToSkillCommand } from '../add-source-to-skill/add-source-to-skill.command';
import { AddFileSourceToSkillCommand } from './add-file-source-to-skill.command';

@Injectable()
export class AddFileSourceToSkillUseCase {
  private readonly logger = new Logger(AddFileSourceToSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly startDocumentProcessingUseCase: StartDocumentProcessingUseCase,
    private readonly addSourceToSkillUseCase: AddSourceToSkillUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: AddFileSourceToSkillCommand): Promise<Skill> {
    this.logger.log('execute', {
      skillId: command.skillId,
      fileName: command.fileName,
    });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    // Document processing uploads to object storage and enqueues an OCR job,
    // neither of which the assignment below can undo — so ownership and the
    // cap are checked first. AddSourceToSkillUseCase re-checks both against a
    // freshly loaded skill and stays authoritative for concurrent adds.
    const skill = await this.skillRepository.findOne(command.skillId, userId);
    if (!skill) {
      throw new SkillNotFoundError(command.skillId);
    }
    assertSkillHasSourceCapacity(skill.sourceIds);

    const source = await this.startDocumentProcessingUseCase.execute(
      new StartDocumentProcessingCommand({
        fileData: command.fileData,
        fileName: command.fileName,
        fileType: command.fileType,
      }),
    );

    return this.addSourceToSkillUseCase.execute(
      new AddSourceToSkillCommand({
        skillId: command.skillId,
        sourceId: source.id,
      }),
    );
  }
}
