import * as fs from 'fs';
import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  detectFileType,
  getCanonicalMimeType,
  isAudioFile,
  isDocumentFile,
  isPlainTextFile,
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
import { Skill } from '../../../domain/skill.entity';
import { SkillRepository } from '../../ports/skill.repository';
import {
  SkillNotFoundError,
  UnsupportedFileTypeError,
  UnexpectedSkillError,
} from '../../skills.errors';
import { assertSkillHasSourceCapacity } from '../../util/skill-source-capacity';
import { AddSourceToSkillUseCase } from '../add-source-to-skill/add-source-to-skill.use-case';
import { AddSourceToSkillCommand } from '../add-source-to-skill/add-source-to-skill.command';
import { AddFileSourceToSkillCommand } from './add-file-source-to-skill.command';

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
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: AddFileSourceToSkillCommand): Promise<Skill> {
    this.logger.log('addFileSourceToSkill', {
      skillId: command.skillId,
      fileName: command.file.originalname,
    });

    const detectedType = detectFileType(
      command.file.mimetype,
      command.file.originalname,
    );

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    // Processing uploads to object storage and enqueues a job, neither of
    // which the attach below can undo cheaply — so ownership and the cap are
    // checked first. AddSourceToSkillUseCase re-checks both against a freshly
    // loaded skill and stays authoritative for concurrent adds.
    const skill = await this.skillRepository.findOne(command.skillId, userId);
    if (!skill) {
      throw new SkillNotFoundError(command.skillId);
    }
    assertSkillHasSourceCapacity(skill.sourceIds);

    if (
      isDocumentFile(detectedType) ||
      isPlainTextFile(detectedType) ||
      isAudioFile(detectedType)
    ) {
      return this.addDocumentSource(
        command.skillId,
        command.file,
        detectedType,
      );
    }
    if (isCSVFile(detectedType) || isSpreadsheetFile(detectedType)) {
      return this.addDataSources(
        skill,
        command.file,
        isCSVFile(detectedType) ? 'csv' : 'spreadsheet',
      );
    }
    throw new UnsupportedFileTypeError(
      detectedType === 'unknown' ? command.file.originalname : detectedType,
      SUPPORTED_FILE_TYPES,
    );
  }

  private async addDocumentSource(
    skillId: UUID,
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
    return this.attachOrCompensate(skillId, [source]);
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
    return this.attachOrCompensate(skill.id, sources);
  }

  // Processing has already started when attaching fails, so the pre-created
  // sources must be deleted or they survive as untracked orphans.
  private async attachOrCompensate(
    skillId: UUID,
    sources: Source[],
  ): Promise<Skill> {
    try {
      return await this.attachSources(skillId, sources);
    } catch (error) {
      try {
        const orgId = this.contextService.get('orgId');
        if (!orgId) throw new UnauthorizedAccessError();
        await this.deleteSourcesUseCase.execute(
          new DeleteSourcesCommand(
            sources.map((source) => source.id),
            orgId,
          ),
        );
      } catch (cleanupError) {
        this.logger.error('Failed to delete sources after attach failure', {
          sourceIds: sources.map((source) => source.id),
          error: cleanupError as Error,
        });
      }
      throw error;
    }
  }

  @Transactional()
  private async attachSources(
    skillId: UUID,
    sources: Source[],
  ): Promise<Skill> {
    let updatedSkill: Skill | undefined;
    for (const source of sources) {
      updatedSkill = await this.addSourceToSkillUseCase.execute(
        new AddSourceToSkillCommand({ skillId, sourceId: source.id }),
      );
    }
    // The start use case guarantees at least one source.
    return updatedSkill as Skill;
  }
}
