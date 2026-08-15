import type { UUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { RevertArtifactCommand } from './revert-artifact.command';
import {
  ArtifactNotFoundError,
  ArtifactVersionNotFoundError,
  UnexpectedArtifactError,
} from '../../artifacts.errors';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { prepareContentForWrite } from '../../helpers/prepare-content-for-write';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { addVersionWithRetry } from '../../helpers/add-version-with-retry';

@Injectable()
export class RevertArtifactUseCase {
  constructor(
    @InjectPinoLogger(RevertArtifactUseCase.name)
    private readonly logger: PinoLogger,
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(command: RevertArtifactCommand): Promise<ArtifactVersion> {
    this.logger.info(
      {
        artifactId: command.artifactId,
        targetVersion: command.versionNumber,
      },
      'Reverting artifact',
    );

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    return await addVersionWithRetry({
      repository: this.artifactsRepository,
      logger: this.logger,
      artifactId: command.artifactId,
      buildVersion: () => this.buildRevertVersion(command, userId),
    });
  }

  private async buildRevertVersion(
    command: RevertArtifactCommand,
    userId: UUID,
  ): Promise<{
    expectedCurrentVersionNumber: number;
    version: ArtifactVersion;
  }> {
    const artifact = await this.artifactsRepository.findByIdWithVersions(
      command.artifactId,
      userId,
    );
    if (!artifact) {
      throw new ArtifactNotFoundError(command.artifactId);
    }

    const targetVersion = artifact.versions.find(
      (v) => v.versionNumber === command.versionNumber,
    );
    if (!targetVersion) {
      throw new ArtifactVersionNotFoundError(
        command.artifactId,
        command.versionNumber,
      );
    }

    const content = prepareContentForWrite(
      artifact.type,
      targetVersion.content,
    );

    return {
      expectedCurrentVersionNumber: artifact.currentVersionNumber,
      version: new ArtifactVersion({
        artifactId: artifact.id,
        versionNumber: artifact.currentVersionNumber + 1,
        content,
        authorType: AuthorType.USER,
        authorId: userId,
      }),
    };
  }
}
