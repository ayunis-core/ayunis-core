import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { CreateArtifactCommand } from './create-artifact.command';
import { Artifact } from '../../../domain/artifact.entity';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class CreateArtifactUseCase {
  private readonly logger = new Logger(CreateArtifactUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(command: CreateArtifactCommand): Promise<Artifact> {
    this.logger.log('Creating artifact', { title: command.title });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const artifact = new Artifact({
      threadId: command.threadId,
      userId,
      title: command.title,
      currentVersionNumber: 1,
    });

    const createdArtifact = await this.artifactsRepository.create(artifact);

    const version = new ArtifactVersion({
      artifactId: createdArtifact.id,
      versionNumber: 1,
      content: command.content,
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
