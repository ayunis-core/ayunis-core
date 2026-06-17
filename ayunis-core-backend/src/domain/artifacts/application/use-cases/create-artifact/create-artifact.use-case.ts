import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { CreateArtifactCommand } from './create-artifact.command';
import {
  Artifact,
  DiagramArtifact,
  DocumentArtifact,
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

      await this.findThreadUseCase.execute(
        new FindThreadQuery(command.threadId),
      );

      const isDocument = command.type === ArtifactType.DOCUMENT;

      if (isDocument && command.letterheadId) {
        await this.findLetterheadUseCase.execute(
          new FindLetterheadQuery({ letterheadId: command.letterheadId }),
        );
      }

      const artifact: Artifact = isDocument
        ? new DocumentArtifact({
            threadId: command.threadId,
            userId,
            title: command.title,
            letterheadId: command.letterheadId ?? null,
            currentVersionNumber: 1,
          })
        : new DiagramArtifact({
            threadId: command.threadId,
            userId,
            title: command.title,
            currentVersionNumber: 1,
          });

      const createdArtifact = await this.artifactsRepository.create(artifact);

      const content = isDocument
        ? sanitizeHtmlContent(command.content)
        : command.content;

      const version = new ArtifactVersion({
        artifactId: createdArtifact.id,
        versionNumber: 1,
        content,
        authorType: command.authorType,
        authorId: command.authorType === AuthorType.USER ? userId : null,
      });

      await this.artifactsRepository.addVersion(version);

      if (createdArtifact instanceof DocumentArtifact) {
        return new DocumentArtifact({
          id: createdArtifact.id,
          threadId: createdArtifact.threadId,
          userId: createdArtifact.userId,
          title: createdArtifact.title,
          letterheadId: createdArtifact.letterheadId,
          currentVersionNumber: createdArtifact.currentVersionNumber,
          versions: [version],
          createdAt: createdArtifact.createdAt,
          updatedAt: createdArtifact.updatedAt,
        });
      }
      return new DiagramArtifact({
        id: createdArtifact.id,
        threadId: createdArtifact.threadId,
        userId: createdArtifact.userId,
        title: createdArtifact.title,
        currentVersionNumber: createdArtifact.currentVersionNumber,
        versions: [version],
        createdAt: createdArtifact.createdAt,
        updatedAt: createdArtifact.updatedAt,
      });
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
}
