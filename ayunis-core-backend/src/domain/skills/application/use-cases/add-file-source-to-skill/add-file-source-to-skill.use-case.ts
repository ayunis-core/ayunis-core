import * as fs from 'fs';
import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
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
import { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import { StartDocumentProcessingCommand } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.command';
import { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import type { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';
import { DataSourceCommandBuilderService } from 'src/domain/sources/application/services/data-source-command-builder.service';
import { UnsupportedSourceFileTypeError } from 'src/domain/sources/application/sources.errors';
import { Skill } from '../../../domain/skill.entity';
import {
  UnsupportedFileTypeError,
  EmptyFileDataError,
  UnexpectedSkillError,
} from '../../skills.errors';
import { AddSourceToSkillUseCase } from '../add-source-to-skill/add-source-to-skill.use-case';
import { AddSourceToSkillCommand } from '../add-source-to-skill/add-source-to-skill.command';
import { AddFileSourceToSkillCommand } from './add-file-source-to-skill.command';

@Injectable()
export class AddFileSourceToSkillUseCase {
  private readonly logger = new Logger(AddFileSourceToSkillUseCase.name);

  constructor(
    private readonly addSourceToSkillUseCase: AddSourceToSkillUseCase,
    private readonly startDocumentProcessingUseCase: StartDocumentProcessingUseCase,
    private readonly createDataSourceUseCase: CreateDataSourceUseCase,
    private readonly dataSourceCommandBuilder: DataSourceCommandBuilderService,
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
    if (isCSVFile(detectedType)) {
      return this.addCsvSource(command.skillId, command.file);
    }
    if (isSpreadsheetFile(detectedType)) {
      return this.addSpreadsheetSources(command.skillId, command.file);
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
    return this.addSourceToSkillUseCase.execute(
      new AddSourceToSkillCommand({ skillId, sourceId: source.id }),
    );
  }

  private async addCsvSource(
    skillId: UUID,
    file: UploadedFileRef,
  ): Promise<Skill> {
    const csvCommand =
      await this.dataSourceCommandBuilder.buildCsvSourceCommand(file);
    return this.createAndAttachSources(skillId, [csvCommand]);
  }

  private async addSpreadsheetSources(
    skillId: UUID,
    file: UploadedFileRef,
  ): Promise<Skill> {
    const commands =
      await this.dataSourceCommandBuilder.buildSpreadsheetSourceCommands(file);
    if (commands.length === 0) {
      throw new EmptyFileDataError(file.originalname);
    }
    return this.createAndAttachSources(skillId, commands);
  }

  @Transactional()
  private async createAndAttachSources(
    skillId: UUID,
    commands: CreateCSVDataSourceCommand[],
  ): Promise<Skill> {
    let updatedSkill: Skill | undefined;
    for (const csvCommand of commands) {
      const source = await this.createDataSourceUseCase.execute(csvCommand);
      updatedSkill = await this.addSourceToSkillUseCase.execute(
        new AddSourceToSkillCommand({ skillId, sourceId: source.id }),
      );
    }
    // Callers guarantee at least one command.
    return updatedSkill as Skill;
  }
}
