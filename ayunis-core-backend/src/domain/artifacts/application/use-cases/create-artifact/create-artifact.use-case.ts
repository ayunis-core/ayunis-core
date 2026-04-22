import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { CreateArtifactCommand } from './create-artifact.command';
import {
  Artifact,
  DiagramArtifact,
  DocumentArtifact,
  JsxArtifact,
} from '../../../domain/artifact.entity';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { ArtifactType } from '../../../domain/value-objects/artifact-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { sanitizeHtmlContent } from '../../helpers/sanitize-html-content';
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
      return await this.performCreate(command);
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

  private async performCreate(
    command: CreateArtifactCommand,
  ): Promise<Artifact> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    if (command.content.length > ARTIFACT_MAX_CONTENT_LENGTH) {
      throw new ArtifactContentTooLargeError(
        command.content.length,
        ARTIFACT_MAX_CONTENT_LENGTH,
      );
    }

    await this.findThreadUseCase.execute(new FindThreadQuery(command.threadId));

    const isDocument = command.type === ArtifactType.DOCUMENT;
    if (isDocument && command.letterheadId) {
      await this.findLetterheadUseCase.execute(
        new FindLetterheadQuery({ letterheadId: command.letterheadId }),
      );
    }

    const createdArtifact = await this.artifactsRepository.create(
      this.buildArtifact(command, userId),
    );

    const version = new ArtifactVersion({
      artifactId: createdArtifact.id,
      versionNumber: 1,
      content: isDocument
        ? sanitizeHtmlContent(command.content)
        : command.content,
      authorType: command.authorType,
      authorId: command.authorType === AuthorType.USER ? userId : null,
    });
    await this.artifactsRepository.addVersion(version);

    return this.rehydrateWithVersion(createdArtifact, version);
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
      case ArtifactType.JSX:
        return new JsxArtifact(base);
    }
  }

  private rehydrateWithVersion(
    artifact: Artifact,
    version: ArtifactVersion,
  ): Artifact {
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
    if (artifact instanceof JsxArtifact) {
      return new JsxArtifact(base);
    }
    return new DiagramArtifact(base);
  }
}
