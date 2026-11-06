import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { MAX_SOURCE_FILE_SIZE_BYTES } from 'src/common/util/source-file-upload';
import {
  type CreatedSourceUpload,
  CreateSourceUploadSessionUseCase,
} from 'src/domain/sources/application/use-cases/create-source-upload-session/create-source-upload-session.use-case';
import { CreateSourceUploadSessionCommand } from 'src/domain/sources/application/use-cases/create-source-upload-session/create-source-upload-session.command';
import { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { assertSkillHasSourceCapacity } from 'src/domain/skills/application/util/skill-source-capacity';
import { CreateSkillSourceUploadCommand } from './create-skill-source-upload.command';

@Injectable()
export class CreateSkillSourceUploadUseCase {
  private readonly logger = new Logger(CreateSkillSourceUploadUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
    private readonly createSession: CreateSourceUploadSessionUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    command: CreateSkillSourceUploadCommand,
  ): Promise<CreatedSourceUpload> {
    this.logger.log(
      { skillId: command.skillId, fileName: command.fileName },
      'createSkillSourceUpload',
    );
    const skill = await this.skillRepository.findById(command.skillId);
    if (!skill) throw new SkillNotFoundError(command.skillId);
    await this.authorization.requireWrite(skill);
    assertSkillHasSourceCapacity(skill.sourceIds);
    return this.createSession.execute(
      new CreateSourceUploadSessionCommand({
        targetType: SourceUploadTargetType.SKILL,
        targetId: skill.id,
        fileName: command.fileName,
        mimeType: command.mimeType,
        fileSize: command.fileSize,
        maxFileSizeBytes: MAX_SOURCE_FILE_SIZE_BYTES,
      }),
    );
  }
}
