import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { CreateArtifactCommand } from './create-artifact.command';
import {
  Artifact,
  DiagramArtifact,
  DocumentArtifact,
  SpreadsheetArtifact,
} from '../../../domain/artifact.entity';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { ArtifactType } from '../../../domain/value-objects/artifact-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { prepareContentForWrite } from '../../helpers/prepare-content-for-write';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { FindLetterheadUseCase } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.use-case';
import { FindLetterheadQuery } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.query';
import {
  ArtifactContentTooLargeError,
  UnexpectedArtifactError,
  ARTIFACT_MAX_CONTENT_LENGTH,
} from '../../artifacts.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class CreateArtifactUseCase {
  private readonly logger = new Logger(CreateArtifactUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly findLetterheadUseCase: FindLetterheadUseCase,
  ) {}

  @Transactional()
  async execute(command: CreateArtifactCommand): Promise<Artifact> {
    this.logger.log('Creating artifact', {
      title: command.title,
      type: command.type,
    });

    try {
      const userId = this.resolveUserId();
      this.validateContentLength(command.content);

      await this.findThreadUseCase.execute(
        new FindThreadQuery(command.threadId),
      );

      if (command.type === ArtifactType.DOCUMENT && command.letterheadId) {
        await this.findLetterheadUseCase.execute(
          new FindLetterheadQuery({ letterheadId: command.letterheadId }),
        );
      }

      const content = prepareContentForWrite(command.type, command.content);
      const createdArtifact = await this.artifactsRepository.create(
        this.buildArtifact(command, userId),
      );

      const version = new ArtifactVersion({
        artifactId: createdArtifact.id,
        versionNumber: 1,
        content,
        authorType: command.authorType,
        authorId: command.authorType === AuthorType.USER ? userId : null,
      });

      await this.artifactsRepository.addVersion(version);

      return this.withVersion(createdArtifact, version);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error('createArtifactUnexpectedError', {
        title: command.title,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedArtifactError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private resolveUserId(): UUID {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    return userId;
  }

  private validateContentLength(content: string): void {
    if (content.length > ARTIFACT_MAX_CONTENT_LENGTH) {
      throw new ArtifactContentTooLargeError(
        content.length,
        ARTIFACT_MAX_CONTENT_LENGTH,
      );
    }
  }

  private buildArtifact(
    command: CreateArtifactCommand,
    userId: UUID,
  ): Artifact {
    const base = {
      threadId: command.threadId,
      userId,
      title: command.title,
      currentVersionNumber: 1,
    };
    switch (command.type) {
      case ArtifactType.DOCUMENT:
        return new DocumentArtifact({
          ...base,
          letterheadId: command.letterheadId ?? null,
        });
      case ArtifactType.DIAGRAM:
        return new DiagramArtifact(base);
      case ArtifactType.SPREADSHEET:
        return new SpreadsheetArtifact(base);
    }
  }

  private withVersion(artifact: Artifact, version: ArtifactVersion): Artifact {
    const base = {
      id: artifact.id,
      threadId: artifact.threadId,
      userId: artifact.userId,
      title: artifact.title,
      currentVersionNumber: artifact.currentVersionNumber,
      versions: [version],
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt,
    };
    if (artifact instanceof DocumentArtifact) {
      return new DocumentArtifact({
        ...base,
        letterheadId: artifact.letterheadId,
      });
    }
    if (artifact instanceof SpreadsheetArtifact) {
      return new SpreadsheetArtifact(base);
    }
    return new DiagramArtifact(base);
  }
}
