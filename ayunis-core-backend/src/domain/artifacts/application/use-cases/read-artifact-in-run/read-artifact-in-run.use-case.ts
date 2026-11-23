import { Injectable } from '@nestjs/common';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import {
  ArtifactNotFoundError,
  ArtifactVersionNotFoundError,
  UnexpectedArtifactError,
} from 'src/domain/artifacts/application/artifacts.errors';
import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { runLookup } from 'src/domain/artifacts/application/models/artifact-run';
import { ArtifactPlaceholdersService } from 'src/domain/artifacts/application/services/artifact-placeholders.service';
import { mapContentText } from 'src/domain/artifacts/application/helpers/map-content-text';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { ReadArtifactInRunQuery } from './read-artifact-in-run.query';

export interface ArtifactInRun {
  artifact: Artifact;
  /** The title, in the run chat's placeholders. */
  title: string;
  /** The current version's content, in the run chat's placeholders. */
  content: string;
  /** The chat's full dictionary, for streaming, when the read references chat masks. */
  threadPiiMasks: ThreadPiiMask[] | null;
}

/**
 * The current version of an artifact as a model run reads it. The artifact
 * must be linked to the run's chat and match the run's mode; an anonymous
 * artifact's placeholders, in its title as in its content, are translated
 * into the chat's.
 */
@Injectable()
export class ReadArtifactInRunUseCase {
  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
    private readonly artifactPlaceholdersService: ArtifactPlaceholdersService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(query: ReadArtifactInRunQuery): Promise<ArtifactInRun> {
    const { userId } = getRequiredUserContext(this.contextService);
    const artifact = await this.artifactsRepository.findByIdWithVersions(
      query.artifactId,
      userId,
      runLookup(query.run),
    );
    if (!artifact) {
      throw new ArtifactNotFoundError(query.artifactId);
    }
    const currentVersion = artifact.versions.find(
      (version) => version.versionNumber === artifact.currentVersionNumber,
    );
    if (!currentVersion) {
      throw new ArtifactVersionNotFoundError(
        artifact.id,
        artifact.currentVersionNumber,
      );
    }
    if (!artifact.isAnonymous) {
      return {
        artifact,
        title: artifact.title,
        content: currentVersion.content,
        threadPiiMasks: null,
      };
    }
    const { translate, threadPiiMasks } =
      await this.artifactPlaceholdersService.toChat(query.run.threadId, [
        { artifact, texts: [artifact.title, currentVersion.content] },
      ]);
    const toChat = (text: string) => translate(artifact, text);
    return {
      artifact,
      title: toChat(artifact.title),
      content: mapContentText(artifact.type, currentVersion.content, toChat),
      threadPiiMasks,
    };
  }
}
