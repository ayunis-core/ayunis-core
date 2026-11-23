import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  ArtifactNotFoundError,
  UnexpectedArtifactError,
} from 'src/domain/artifacts/application/artifacts.errors';
import {
  resolveContentPlaceholders,
  resolveTitlePlaceholders,
} from 'src/domain/artifacts/application/helpers/resolve-artifact-placeholders';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import { ArtifactManageAccessService } from 'src/domain/artifacts/application/services/artifact-manage-access.service';
import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ConvertArtifactToNormalCommand } from './convert-artifact-to-normal.command';

/**
 * Turns an anonymous artifact into a normal one, so normal chats can take it:
 * every version gets the real values of its dictionary, the dictionary is
 * deleted and so are its links to anonymous chats, which keep their messages
 * and masks. Allowed to those who may delete it. A write that lands first
 * makes the conversion fail with `ArtifactVersionConflictError`; converting a
 * normal artifact changes nothing.
 */
@Injectable()
export class ConvertArtifactToNormalUseCase {
  private readonly logger = new Logger(ConvertArtifactToNormalUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly manageAccess: ArtifactManageAccessService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(command: ConvertArtifactToNormalCommand): Promise<void> {
    this.logger.log(
      { artifactId: command.artifactId },
      'Converting artifact to normal',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    const artifact = await this.artifactsRepository.findByIdWithVersions(
      command.artifactId,
      userId,
    );
    if (!artifact) {
      throw new ArtifactNotFoundError(command.artifactId);
    }
    await this.manageAccess.assertCanManage(artifact, userId);
    if (!artifact.isAnonymous) {
      return;
    }

    await this.artifactsRepository.convertToNormal({
      artifactId: artifact.id,
      expectedCurrentVersionNumber: artifact.currentVersionNumber,
      title: resolveTitlePlaceholders(artifact.title, artifact.piiMasks),
      versions: this.resolveVersions(artifact),
    });
  }

  /** The versions whose content changes. */
  private resolveVersions(artifact: Artifact) {
    return artifact.versions.flatMap((version) => {
      const content = resolveContentPlaceholders(
        artifact.type,
        version.content,
        artifact.piiMasks,
      );
      return content === version.content ? [] : [{ id: version.id, content }];
    });
  }
}
