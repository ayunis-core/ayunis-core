import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { PermittedLanguageModel } from '../../../domain/permitted-model.entity';
import { GetPermittedLanguageModelQuery } from './get-permitted-language-model.query';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  ModelNotFoundByIdError,
  UnexpectedModelError,
} from '../../models.errors';
import { Injectable } from '@nestjs/common';
import { BaseUseCase } from 'src/common/use-case/base-use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@Injectable()
export class GetPermittedLanguageModelUseCase extends BaseUseCase {
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
  ) {
    super();
  }

  async execute(
    query: GetPermittedLanguageModelQuery,
  ): Promise<PermittedLanguageModel> {
    this.logger.log('getPermittedLanguageModel', {
      query,
    });
    const orgId = this.contextService.get('orgId');
    const systemRole = this.contextService.get('systemRole');

    try {
      const model = await this.permittedModelsRepository.findOneLanguage({
        id: query.id,
      });
      const isFromOrg = orgId === model?.orgId;
      const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
      if (!isFromOrg && !isSuperAdmin) {
        throw new UnauthorizedAccessError();
      }
      if (!model) {
        this.logger.error('model not found', {
          query,
        });
        throw new ModelNotFoundByIdError(query.id);
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
