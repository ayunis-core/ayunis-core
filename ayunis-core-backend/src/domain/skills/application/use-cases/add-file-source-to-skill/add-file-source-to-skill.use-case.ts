import type { Skill } from 'src/domain/skills/domain/skill';
import * as fs from 'fs';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  detectFileType,
  getCanonicalMimeType,
  isDocumentSourceFile,
  isSpreadsheetFile,
  isCSVFile,
  SUPPORTED_FILE_TYPES,
  type DetectedFileType,
} from 'src/common/util/file-type';
import type { UploadedFileRef } from 'src/common/util/source-file-upload';
import { Source } from 'src/domain/sources/domain/source.entity';
import type { DataSourceFileKind } from 'src/domain/sources/domain/data-source-file-kind.type';
import { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import { StartDocumentProcessingCommand } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.command';
import { StartDataSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/start-data-source-processing/start-data-source-processing.use-case';
import { StartDataSourceProcessingCommand } from 'src/domain/sources/application/use-cases/start-data-source-processing/start-data-source-processing.command';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { UnsupportedSourceFileTypeError } from 'src/domain/sources/application/sources.errors';

import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import {
  SkillNotFoundError,
  UnsupportedFileTypeError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { assertSkillHasSourceCapacity } from 'src/domain/skills/application/util/skill-source-capacity';
import { AddSourceToSkillUseCase } from 'src/domain/skills/application/use-cases/add-source-to-skill/add-source-to-skill.use-case';
import { AddSourceToSkillCommand } from 'src/domain/skills/application/use-cases/add-source-to-skill/add-source-to-skill.command';
import { AddFileSourceToSkillCommand } from './add-file-source-to-skill.command';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';

@Injectable()
export class AddFileSourceToSkillUseCase {
  private readonly logger = new Logger(AddFileSourceToSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly addSourceToSkillUseCase: AddSourceToSkillUseCase,
    private readonly startDocumentProcessingUseCase: StartDocumentProcessingUseCase,
    private readonly startDataSourceProcessingUseCase: StartDataSourceProcessingUseCase,
    private readonly deleteSourcesUseCase: DeleteSourcesUseCase,
    private readonly contextService: ContextService,
    private readonly authorization: SkillAuthorizationService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: AddFileSourceToSkillCommand): Promise<Skill> {
    this.logger.log(
      { skillId: command.skillId, fileName: command.file.originalname },
      'addFileSourceToSkill',
    );
    const skill = await this.skillRepository.findById(command.skillId);
    if (!skill) throw new SkillNotFoundError(command.skillId);
    await this.authorization.requireWrite(skill);
    return this.processFile(skill, command.file);
  }

  private async processFile(
    skill: Skill,
    file: UploadedFileRef,
  ): Promise<Skill> {
    const detectedType = detectFileType(file.mimetype, file.originalname);
    assertSkillHasSourceCapacity(skill.sourceIds);

    if (isDocumentSourceFile(detectedType)) {
      return this.addDocumentSource(skill, file, detectedType);
    }
    if (isCSVFile(detectedType) || isSpreadsheetFile(detectedType)) {
      return this.addDataSources(
        skill,
        file,
        isCSVFile(detectedType) ? 'csv' : 'spreadsheet',
      );
    }
    throw new UnsupportedFileTypeError(
      detectedType === 'unknown' ? file.originalname : detectedType,
      SUPPORTED_FILE_TYPES,
    );
  }

  private async addDocumentSource(
    skill: Skill,
    file: UploadedFileRef,
    detectedType: DetectedFileType,
  ): Promise<Skill> {
    const canonicalMimeType = getCanonicalMimeType(detectedType);
    if (!canonicalMimeType) {
      throw new UnsupportedSourceFileTypeError(detectedType);
    }
    const source = await this.startDocumentProcessingUseCase.execute(
      new StartDocumentProcessingCommand({
        fileData: await fs.promises.readFile(file.path),
        fileName: file.originalname,
        fileType: canonicalMimeType,
      }),
    );
    return this.attachOrCompensate(skill, [source]);
  }

  private async addDataSources(
    skill: Skill,
    file: UploadedFileRef,
    kind: DataSourceFileKind,
  ): Promise<Skill> {
    const sources = await this.startDataSourceProcessingUseCase.execute(
      new StartDataSourceProcessingCommand({
        fileData: await fs.promises.readFile(file.path),
        fileName: file.originalname,
        kind,
        // A workbook creates one source per data sheet; re-check the cap with
        // the real count so an oversized upload is rejected before any
        // sources, storage objects, or jobs exist.
        ensureCapacityFor: (sourceCount) =>
          assertSkillHasSourceCapacity(skill.sourceIds, sourceCount),
      }),
    );
    return this.attachOrCompensate(skill, sources);
  }

  // Processing has already started when attaching fails, so the pre-created
  // sources must be deleted or they survive as untracked orphans.
  private async attachOrCompensate(
    skill: Skill,
    sources: Source[],
  ): Promise<Skill> {
    try {
      return await this.attachSources(skill, sources);
    } catch (error) {
      try {
        await this.deleteCreatedSources(sources);
      } catch (cleanupError) {
        this.logger.error(
          {
            sourceIds: sources.map((source) => source.id),
            err: cleanupError as Error,
          },
          'Failed to delete sources after attach failure',
        );
      }
      throw error;
    }
  }

  private async deleteCreatedSources(sources: Source[]): Promise<void> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) throw new UnauthorizedAccessError();
    await this.deleteSourcesUseCase.execute(
      new DeleteSourcesCommand(
        sources.map((source) => source.id),
        orgId,
      ),
    );
  }

  @Transactional()
  private async attachSources(skill: Skill, sources: Source[]): Promise<Skill> {
    let updatedSkill = skill;
    for (const source of sources) {
      updatedSkill = await this.addSourceToSkillUseCase.execute(
        new AddSourceToSkillCommand({
          skillId: skill.id,
          sourceId: source.id,
        }),
      );
    }
    // The start use case guarantees at least one source.
    return updatedSkill;
  }
}
