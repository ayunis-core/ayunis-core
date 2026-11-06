import type { Skill } from 'src/domain/skills/domain/skill';
import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Source } from 'src/domain/sources/domain/source.entity';
import { CompleteSourceUploadUseCase } from 'src/domain/sources/application/use-cases/complete-source-upload/complete-source-upload.use-case';
import { CompleteSourceUploadCommand } from 'src/domain/sources/application/use-cases/complete-source-upload/complete-source-upload.command';
import { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { assertSkillHasSourceCapacity } from 'src/domain/skills/application/util/skill-source-capacity';
import { AddSourceToSkillUseCase } from 'src/domain/skills/application/use-cases/add-source-to-skill/add-source-to-skill.use-case';
import { AddSourceToSkillCommand } from 'src/domain/skills/application/use-cases/add-source-to-skill/add-source-to-skill.command';
import { CompleteSkillSourceUploadCommand } from './complete-skill-source-upload.command';

/** See CompleteThreadSourceUploadUseCase; attaches to a skill instead. */
@Injectable()
export class CompleteSkillSourceUploadUseCase {
  private readonly logger = new Logger(CompleteSkillSourceUploadUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
    private readonly completeUpload: CompleteSourceUploadUseCase,
    private readonly addSourceToSkillUseCase: AddSourceToSkillUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: CompleteSkillSourceUploadCommand): Promise<Skill> {
    this.logger.log(
      { skillId: command.skillId, uploadId: command.uploadId },
      'completeSkillSourceUpload',
    );
    const skill = await this.skillRepository.findById(command.skillId);
    if (!skill) throw new SkillNotFoundError(command.skillId);
    await this.authorization.requireWrite(skill);

    let updatedSkill = skill;
    await this.completeUpload.execute(
      new CompleteSourceUploadCommand({
        uploadId: command.uploadId,
        targetType: SourceUploadTargetType.SKILL,
        targetId: skill.id,
        ensureCapacityFor: (sourceCount) =>
          assertSkillHasSourceCapacity(skill.sourceIds, sourceCount),
        attach: async (sources) => {
          updatedSkill = await this.attachSources(skill, sources);
        },
      }),
    );
    return updatedSkill;
  }

  private async attachSources(skill: Skill, sources: Source[]): Promise<Skill> {
    let updatedSkill = skill;
    for (const source of sources) {
      updatedSkill = await this.addSourceToSkillUseCase.execute(
        new AddSourceToSkillCommand({ skillId: skill.id, sourceId: source.id }),
      );
    }
    return updatedSkill;
  }
}
