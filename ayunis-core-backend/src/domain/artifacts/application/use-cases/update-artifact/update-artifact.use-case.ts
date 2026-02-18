import { Injectable, Logger } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { UpdateArtifactCommand } from './update-artifact.command';
import { ArtifactNotFoundError } from '../../artifacts.errors';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class UpdateArtifactUseCase {
  private readonly logger = new Logger(UpdateArtifactUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdateArtifactCommand): Promise<ArtifactVersion> {
    this.logger.log('Updating artifact', { artifactId: command.artifactId });

    const artifact = await this.artifactsRepository.findById(
      command.artifactId,
    );
    if (!artifact) {
      throw new ArtifactNotFoundError(command.artifactId);
    }

    const newVersionNumber = artifact.currentVersionNumber + 1;
    const userId = this.contextService.get('userId');

    const version = new ArtifactVersion({
      artifactId: artifact.id,
      versionNumber: newVersionNumber,
      content: command.content,
      authorType: command.authorType,
      authorId:
        command.authorType === AuthorType.USER ? (userId ?? null) : null,
    });

    const createdVersion = await this.artifactsRepository.addVersion(version);

    await this.artifactsRepository.updateCurrentVersionNumber(
      artifact.id,
      newVersionNumber,
    );

    return createdVersion;
  }
}
