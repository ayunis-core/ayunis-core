import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { CreateArtifactCommand } from './create-artifact.command';
import { Artifact } from '../../../domain/artifact.entity';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { sanitizeHtmlContent } from '../../../domain/sanitize-html-content';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import {
  ArtifactContentTooLargeError,
  ARTIFACT_MAX_CONTENT_LENGTH,
} from '../../artifacts.errors';

@Injectable()
export class CreateArtifactUseCase {
  private readonly logger = new Logger(CreateArtifactUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
    private readonly findThreadUseCase: FindThreadUseCase,
  ) {}

  @Transactional()
  async execute(command: CreateArtifactCommand): Promise<Artifact> {
    this.logger.log('Creating artifact', { title: command.title });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (command.content.length > ARTIFACT_MAX_CONTENT_LENGTH) {
      throw new ArtifactContentTooLargeError(
        command.content.length,
        ARTIFACT_MAX_CONTENT_LENGTH,
      );
    }

    await this.findThreadUseCase.execute(new FindThreadQuery(command.threadId));

    const artifact = new Artifact({
      threadId: command.threadId,
      userId,
      title: command.title,
      currentVersionNumber: 1,
    });

    const createdArtifact = await this.artifactsRepository.create(artifact);

    const sanitizedContent = sanitizeHtmlContent(command.content);

    const version = new ArtifactVersion({
      artifactId: createdArtifact.id,
      versionNumber: 1,
      content: sanitizedContent,
      authorType: command.authorType,
      authorId: command.authorType === AuthorType.USER ? userId : null,
    });

    await this.artifactsRepository.addVersion(version);

    return new Artifact({
      ...createdArtifact,
      versions: [version],
    });
  }
}
