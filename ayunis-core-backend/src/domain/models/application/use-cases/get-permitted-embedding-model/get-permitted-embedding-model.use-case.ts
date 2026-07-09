import { PermittedEmbeddingModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { GetPermittedEmbeddingModelQuery } from './get-permitted-embedding-model.query';
import {
  PermittedEmbeddingModelNotFoundForOrgError,
  UnexpectedModelError,
} from '../../models.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { Injectable } from '@nestjs/common';
import { BaseUseCase } from 'src/common/use-case/base-use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@Injectable()
export class GetPermittedEmbeddingModelUseCase extends BaseUseCase {
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
  ) {
    super();
  }

  async execute(
    query: GetPermittedEmbeddingModelQuery,
  ): Promise<PermittedEmbeddingModel> {
    this.logger.log('execute', {
      orgId: query.orgId,
    });

    try {
      const orgId = this.contextService.get('orgId');
      const systemRole = this.contextService.get('systemRole');
      const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
      const isFromOrg = orgId === query.orgId;
      if (!isFromOrg && !isSuperAdmin) {
        throw new UnauthorizedAccessError();
      }
      const model = await this.permittedModelsRepository.findOneEmbedding(
        query.orgId,
      );
      if (!model || !(model instanceof PermittedEmbeddingModel)) {
        throw new PermittedEmbeddingModelNotFoundForOrgError(query.orgId);
      }
      return model;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new UnexpectedModelError(error as Error);
    }
  }
}
