import { Injectable } from '@nestjs/common';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import { UnexpectedArtifactError } from 'src/domain/artifacts/application/artifacts.errors';
import { ArtifactPlaceholdersService } from 'src/domain/artifacts/application/services/artifact-placeholders.service';
import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { getRequiredUserContext } from 'src/common/context/required-context';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { FindArtifactsForRunQuery } from './find-artifacts-for-run.query';

export interface ArtifactsForRun {
  /** Each artifact with its title in the run chat's placeholders. */
  artifacts: { artifact: Artifact; title: string }[];
  /** The chat's full dictionary, for streaming, when the titles reference chat masks. */
  threadPiiMasks: ThreadPiiMask[] | null;
}

/**
 * The artifacts a model run is offered: those linked to its chat whose mode
 * matches the run's, in link order. Anonymous artifacts' titles are
 * translated into the chat's placeholders.
 */
@Injectable()
export class FindArtifactsForRunUseCase {
  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
    private readonly artifactPlaceholdersService: ArtifactPlaceholdersService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(query: FindArtifactsForRunQuery): Promise<ArtifactsForRun> {
    const { userId } = getRequiredUserContext(this.contextService);
    const artifacts = await this.artifactsRepository.findByThreadId(
      query.run.threadId,
      userId,
      { isAnonymous: query.run.isAnonymous },
    );
    if (!query.run.isAnonymous) {
      return {
        artifacts: artifacts.map((artifact) => ({
          artifact,
          title: artifact.title,
        })),
        threadPiiMasks: null,
      };
    }
    const { translate, threadPiiMasks } =
      await this.artifactPlaceholdersService.toChat(
        query.run.threadId,
        artifacts.map((artifact) => ({ artifact, texts: [artifact.title] })),
      );
    return {
      artifacts: artifacts.map((artifact) => ({
        artifact,
        title: translate(artifact, artifact.title),
      })),
      threadPiiMasks,
    };
  }
}
