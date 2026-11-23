import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import { UnexpectedArtifactError } from 'src/domain/artifacts/application/artifacts.errors';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { FindPersonalArtifactsQuery } from './find-personal-artifacts.query';

/** The caller's own artifacts for the Ablage; never workspace artifacts. */
@Injectable()
export class FindPersonalArtifactsUseCase {
  private readonly logger = new Logger(FindPersonalArtifactsUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(
    query: FindPersonalArtifactsQuery,
  ): Promise<Paginated<Artifact>> {
    this.logger.log(
      { type: query.type, limit: query.limit, offset: query.offset },
      'Finding personal artifacts',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    return this.artifactsRepository.findByOwner(
      { type: 'personal', userId },
      {
        search: query.search,
        type: query.type,
        isAnonymous: query.isAnonymous,
        limit: query.limit,
        offset: query.offset,
      },
    );
  }
}
