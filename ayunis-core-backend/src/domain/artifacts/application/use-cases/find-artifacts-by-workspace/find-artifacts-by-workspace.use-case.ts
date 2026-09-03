import { Injectable, Logger } from '@nestjs/common';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { UnexpectedArtifactError } from 'src/domain/artifacts/application/artifacts.errors';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FindWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/find-workspace/find-workspace.use-case';
import { FindWorkspaceQuery } from 'src/domain/workspaces/application/use-cases/find-workspace/find-workspace.query';
import { FindArtifactsByWorkspaceQuery } from './find-artifacts-by-workspace.query';

@Injectable()
export class FindArtifactsByWorkspaceUseCase {
  private readonly logger = new Logger(FindArtifactsByWorkspaceUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
    private readonly findWorkspaceUseCase: FindWorkspaceUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(
    query: FindArtifactsByWorkspaceQuery,
  ): Promise<Paginated<Artifact>> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log(
      { workspaceId: query.workspaceId },
      'Finding artifacts by workspace',
    );
    await this.findWorkspaceUseCase.execute(
      new FindWorkspaceQuery(query.workspaceId),
    );

    return this.artifactsRepository.findByWorkspaceId(
      query.workspaceId,
      userId,
      {
        search: query.search,
        type: query.type,
        limit: query.limit,
        offset: query.offset,
      },
    );
  }
}
